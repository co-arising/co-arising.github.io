// Handwritten isolation-zone @cloze implementation for application story CashFundPurchase
// Edit ONLY inside the bounded @cloze slot "cash-fund-purchase" below.
import { dec, decCmp } from "../generated-scaffold/ts/exact.ts";
import type { CashFundPurchaseHandler, CashFundPurchaseRequest, CashFundPurchaseExternPorts, CashFundPurchaseEffectsPort, CashFundPurchaseOutcome } from "../generated-scaffold/ts/cash-fund-purchase.port.ts";

export const __appExactHelpers = { dec, decCmp };

export const cashFundPurchaseHandler: CashFundPurchaseHandler = {
  handle(req: CashFundPurchaseRequest, externs: CashFundPurchaseExternPorts, effects: CashFundPurchaseEffectsPort): CashFundPurchaseOutcome {
    // @cloze:start(cash-fund-purchase)
    if (req.operation === "BankOrderQuery.get") {
      const orderSnap = (req.stateSnapshot?.order ?? req.payload.order ?? {}) as Readonly<Record<string, unknown>>;
      const paymentCompleted = orderSnap.paymentOutcome === "succeeded";
      const taFinalized = paymentCompleted && orderSnap.taStatus === "confirmed";
      let ruleId = "US-CFP-08";
      if (paymentCompleted && !taFinalized) ruleId = "US-CFP-06";
      else if (paymentCompleted && taFinalized) ruleId = "US-CFP-07";
      return {
        ok: true,
        ruleId,
        viewName: "bank-order-view",
        view: { paymentCompleted, taFinalized },
      };
    }

    const principal = req.payload.principal;
    const clientRequestId = req.payload.clientRequestId;
    const fundCode = req.payload.fundCode;
    const amountObj = (req.payload.amount ?? {}) as Readonly<Record<string, unknown>>;

    if (!externs.sessionAuthenticated(principal) || !externs.originAndCsrfValid()) {
      return { ok: false, code: "UNAUTHORIZED_OR_CSRF", ruleId: "US-CFP-01" };
    }

    const currency = typeof amountObj.currency === "string" ? amountObj.currency : "";
    const rawAmount = amountObj.amount;
    const validSubmit = currency === "CNY"
      && rawAmount !== undefined
      && rawAmount !== null
      && decCmp(dec(String(rawAmount), 2), dec("0.00", 2)) > 0;
    if (!externs.fundCodeActive(fundCode) || !validSubmit) {
      return { ok: false, code: "INVALID_CASH_SUBMIT", ruleId: "US-CFP-02" };
    }

    // Never trust client-supplied operationId, investorAccountId, or fundCollectionAccountId ([AX-APP-1])
    const sanitizedPayload = { principal, clientRequestId, fundCode, amount: { currency, amount: String(rawAmount) } };

    if (!externs.requestExists(principal, clientRequestId)) {
      effects.pin("BankCashOriginal", { principal, clientRequestId });
      effects.dispatch("FundOrder.RecordCashRequestSource", sanitizedPayload);
      effects.dispatch("FundOrder.RequestFundPurchaseSettlement", sanitizedPayload);
      return {
        ok: true,
        ruleId: "US-CFP-03",
        responseType: "BankCashAcknowledgement",
        response: { replayed: false, accepted: true },
      };
    }

    if (externs.payloadMatchesOriginal(principal, clientRequestId, fundCode, sanitizedPayload.amount)) {
      return {
        ok: true,
        ruleId: "US-CFP-04",
        responseType: "BankCashAcknowledgement",
        response: { replayed: true, accepted: true },
      };
    }

    return { ok: false, code: "CASH_SOURCE_CONFLICT", ruleId: "US-CFP-05" };
    // @cloze:end(cash-fund-purchase)
  },
};
