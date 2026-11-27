// Handwritten L3 application isolation-zone implementation for TaBridgeSettlement
// Edit ONLY inside the bounded @cloze slot "ta-bridge-settlement" below.
package example.bankwealth.v2.application.services

import net.imadz.common.CommonTypes.iMadzError

object TaBridgeSettlementImpl extends TaBridgeSettlementHandler {
  override def handle(req: TaBridgeSettlementRequest, externs: TaBridgeSettlementExternPorts, effects: TaBridgeSettlementEffectsPort): Either[iMadzError, TaBridgeSettlementSuccessResponse] = {
    // @cloze:start(ta-bridge-settlement)
    val orderId = req.payload.getOrElse("orderId", "")
    if (!externs.submissionPinned(orderId)) {
      Left(iMadzError("TA_UNKNOWN_ORIGINAL", "TA-BR-01"))
    } else if (!externs.taReceiptAuthentic(orderId)) {
      Left(iMadzError("TA_INVALID_RECEIPT", "TA-BR-02"))
    } else {
      val sanitized: Map[String, Any] = Map("orderId" -> orderId)
      if (externs.taOutcomeConfirmed(orderId)) {
        effects.dispatch("FundOrder.RecordFundTAConfirmed", sanitized)
        Right(TaBridgeSettlementSuccessResponse(
          ruleId = "TA-BR-03",
          responseType = Some("TaBridgeAcknowledgement"),
          response = Map("state" -> "confirmed")
        ))
      } else if (externs.taOutcomeRejected(orderId) || externs.taAbsenceConfirmed(orderId)) {
        effects.dispatch("FundOrder.RequestIndependentRefund", sanitized)
        Right(TaBridgeSettlementSuccessResponse(
          ruleId = "TA-BR-04",
          responseType = Some("TaBridgeAcknowledgement"),
          response = Map("state" -> "refund_dispatched")
        ))
      } else {
        // Timeout / unknown without explicit absence proof: NEVER trigger blind refund ([TA-BR-05])
        Right(TaBridgeSettlementSuccessResponse(
          ruleId = "TA-BR-05",
          responseType = Some("TaBridgeAcknowledgement"),
          response = Map("state" -> "pending_reconcile")
        ))
      }
    }
    // @cloze:end(ta-bridge-settlement)
  }
}
