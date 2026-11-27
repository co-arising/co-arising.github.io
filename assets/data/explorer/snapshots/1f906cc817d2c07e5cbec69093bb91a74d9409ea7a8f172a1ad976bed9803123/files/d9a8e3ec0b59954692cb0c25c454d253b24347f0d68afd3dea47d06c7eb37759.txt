// Handwritten isolation-zone @cloze implementation for application story TaBridgeSettlement
// Edit ONLY inside the bounded @cloze slot "ta-bridge-settlement" below.
import { dec, decCmp } from "../generated-scaffold/ts/exact.ts";
import type { TaBridgeSettlementHandler, TaBridgeSettlementRequest, TaBridgeSettlementExternPorts, TaBridgeSettlementEffectsPort, TaBridgeSettlementOutcome } from "../generated-scaffold/ts/ta-bridge-settlement.port.ts";

export const __appExactHelpers = { dec, decCmp };

export const taBridgeSettlementHandler: TaBridgeSettlementHandler = {
  handle(req: TaBridgeSettlementRequest, externs: TaBridgeSettlementExternPorts, effects: TaBridgeSettlementEffectsPort): TaBridgeSettlementOutcome {
    // @cloze:start(ta-bridge-settlement)
    const orderId = req.payload.orderId;
    if (!externs.submissionPinned(orderId)) {
      return { ok: false, code: "TA_UNKNOWN_ORIGINAL", ruleId: "TA-BR-01" };
    }
    if (!externs.taReceiptAuthentic(orderId)) {
      return { ok: false, code: "TA_INVALID_RECEIPT", ruleId: "TA-BR-02" };
    }

    // [AX-TA-1]: strip untrusted investorAccountId & fundCollectionAccountId; forward only orderId
    const sanitized = { orderId };

    if (externs.taOutcomeConfirmed(orderId)) {
      effects.dispatch("FundOrder.RecordFundTAConfirmed", sanitized);
      return {
        ok: true,
        ruleId: "TA-BR-03",
        responseType: "TaBridgeAcknowledgement",
        response: { state: "confirmed" },
      };
    }

    if (externs.taOutcomeRejected(orderId) || externs.taAbsenceConfirmed(orderId)) {
      effects.dispatch("FundOrder.RequestIndependentRefund", sanitized);
      return {
        ok: true,
        ruleId: "TA-BR-04",
        responseType: "TaBridgeAcknowledgement",
        response: { state: "refund_dispatched" },
      };
    }

    // Timeout / unknown without explicit absence proof: NEVER trigger blind refund ([TA-BR-05])
    return {
      ok: true,
      ruleId: "TA-BR-05",
      responseType: "TaBridgeAcknowledgement",
      response: { state: "pending_reconcile" },
    };
    // @cloze:end(ta-bridge-settlement)
  },
};
