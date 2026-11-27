// Handwritten isolation-zone @cloze implementation for FundOrder.ConfirmTAShares (L2 / QF_NIA)
// Edit ONLY inside the bounded @cloze slot "fund-order-confirm-tashares" below.
import { dec, decAdd, decSub, decMul, decCmp, decInInterval, decFormat } from "../generated-scaffold/ts/exact.ts";
import type { FundOrderState, FundOrderEvent, FundOrderClozeHandlers, RecordFundTAConfirmedCommand } from "../generated-scaffold/ts/fund-order.behavior.ts";
import type { CommandOutcome } from "../generated-scaffold/ts/types.ts";

export const __exactHelpers = { dec, decAdd, decSub, decMul, decCmp, decInInterval, decFormat };

export const fundOrderConfirmTASharesCloze: FundOrderClozeHandlers = {
  recordFundTAConfirmed(state: FundOrderState, cmd: RecordFundTAConfirmedCommand): CommandOutcome<FundOrderEvent> {
    // @cloze:start(fund-order-confirm-tashares)
    const navDec = dec(cmd.nav, 4);
    if (decCmp(navDec, dec("0.0000", 4)) <= 0) {
      return { ok: false, code: "TA_INVALID_NAV", ruleId: "TA_INVALID_NAV" };
    }
    const netAmountDec = dec(state.netAmount, 2);
    const sharesDec = dec(cmd.shares, 0);
    const nextSharesDec = dec(cmd.shares + 1, 0);
    const exactFloor = cmd.shares >= 0
      && decCmp(decMul(sharesDec, navDec), netAmountDec) <= 0
      && decCmp(decMul(nextSharesDec, navDec), netAmountDec) > 0;
    if (!exactFloor) {
      return { ok: false, code: "TA_SHARES_MISMATCH", ruleId: "TA_SHARES_MISMATCH" };
    }
    if (state.paymentOutcome !== "succeeded") {
      return { ok: false, code: "TA_PAYMENT_NOT_SUCCEEDED", ruleId: "TA_PAYMENT_NOT_SUCCEEDED" };
    }
    if (state.taStatus === "confirmed") {
      return { ok: false, code: "TA_ALREADY_CONFIRMED", ruleId: "TA_ALREADY_CONFIRMED" };
    }
    return {
      ok: true,
      events: [{ type: "FundTASharesConfirmed", shares: cmd.shares, nav: cmd.nav }],
      ruleId: "TA_CONFIRMED",
    };
    // @cloze:end(fund-order-confirm-tashares)
  },
};
