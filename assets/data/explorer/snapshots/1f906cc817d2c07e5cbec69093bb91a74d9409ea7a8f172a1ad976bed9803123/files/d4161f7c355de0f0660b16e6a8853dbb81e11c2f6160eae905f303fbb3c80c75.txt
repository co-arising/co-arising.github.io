// Handwritten L3 application isolation-zone implementation for CashFundPurchase
// Edit ONLY inside the bounded @cloze slot "cash-fund-purchase" below.
package example.bankwealth.v2.application.services

import net.imadz.common.CommonTypes.iMadzError

object CashFundPurchaseImpl extends CashFundPurchaseHandler {
  override def handle(req: CashFundPurchaseRequest, externs: CashFundPurchaseExternPorts, effects: CashFundPurchaseEffectsPort): Either[iMadzError, CashFundPurchaseSuccessResponse] = {
    // @cloze:start(cash-fund-purchase)
    if (req.operation == "BankOrderQuery.get") {
      val orderSnap = req.stateSnapshot.get("order")
        .orElse(req.payload.get("order"))
        .collect { case m: Map[_, _] => m.asInstanceOf[Map[String, Any]] }
        .getOrElse(Map.empty[String, Any])
      val paymentCompleted = orderSnap.get("paymentOutcome").contains("succeeded")
      val taFinalized = paymentCompleted && orderSnap.get("taStatus").contains("confirmed")
      val ruleId =
        if (paymentCompleted && !taFinalized) "US-CFP-06"
        else if (paymentCompleted && taFinalized) "US-CFP-07"
        else "US-CFP-08"
      Right(CashFundPurchaseSuccessResponse(
        ruleId = ruleId,
        viewName = Some("bank-order-view"),
        view = Map("paymentCompleted" -> paymentCompleted, "taFinalized" -> taFinalized)
      ))
    } else {
      val principal = req.payload.getOrElse("principal", "")
      val clientRequestId = req.payload.getOrElse("clientRequestId", "")
      val fundCode = req.payload.getOrElse("fundCode", "")
      val amountMap = req.payload.get("amount")
        .collect { case m: Map[_, _] => m.asInstanceOf[Map[String, Any]] }
        .getOrElse(Map.empty[String, Any])

      if (!externs.sessionAuthenticated(principal) || !externs.originAndCsrfValid()) {
        Left(iMadzError("UNAUTHORIZED_OR_CSRF", "US-CFP-01"))
      } else {
        val currency = amountMap.get("currency").map(_.toString).getOrElse("")
        val parsedAmount = amountMap.get("amount").flatMap { v =>
          scala.util.Try(BigDecimal(v.toString)).toOption
        }
        val validSubmit = currency == "CNY" && parsedAmount.exists(_ > BigDecimal("0.00"))
        if (!externs.fundCodeActive(fundCode) || !validSubmit) {
          Left(iMadzError("INVALID_CASH_SUBMIT", "US-CFP-02"))
        } else {
          // Never trust client-supplied operationId, investorAccountId, or fundCollectionAccountId ([AX-APP-1])
          val sanitizedAmount: Map[String, Any] = Map("currency" -> currency, "amount" -> parsedAmount.get.toString)
          val sanitizedPayload: Map[String, Any] = Map(
            "principal" -> principal,
            "clientRequestId" -> clientRequestId,
            "fundCode" -> fundCode,
            "amount" -> sanitizedAmount
          )
          if (!externs.requestExists(principal, clientRequestId)) {
            effects.pin("BankCashOriginal", Map("principal" -> principal, "clientRequestId" -> clientRequestId))
            effects.dispatch("FundOrder.RecordCashRequestSource", sanitizedPayload)
            effects.dispatch("FundOrder.RequestFundPurchaseSettlement", sanitizedPayload)
            Right(CashFundPurchaseSuccessResponse(
              ruleId = "US-CFP-03",
              responseType = Some("BankCashAcknowledgement"),
              response = Map("replayed" -> false, "accepted" -> true)
            ))
          } else if (externs.payloadMatchesOriginal(principal, clientRequestId, fundCode, sanitizedAmount)) {
            Right(CashFundPurchaseSuccessResponse(
              ruleId = "US-CFP-04",
              responseType = Some("BankCashAcknowledgement"),
              response = Map("replayed" -> true, "accepted" -> true)
            ))
          } else {
            Left(iMadzError("CASH_SOURCE_CONFLICT", "US-CFP-05"))
          }
        }
      }
    }
    // @cloze:end(cash-fund-purchase)
  }
}
