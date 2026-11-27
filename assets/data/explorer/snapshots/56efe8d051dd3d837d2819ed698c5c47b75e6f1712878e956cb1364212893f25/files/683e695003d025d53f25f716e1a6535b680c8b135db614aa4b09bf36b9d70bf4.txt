// Handwritten L2 domain isolation-zone implementation for FundOrder.ConfirmTAShares (L2 / QF_NIA)
// Edit ONLY inside the bounded @cloze slot "fund-order-confirm-tashares" below.
package example.bankwealth.v2.domain.services.impl

import example.bankwealth.v2.domain.entities.FundOrderEntity._
import example.bankwealth.v2.domain.invariants.params.FundOrderRuleParams._
import net.imadz.common.CommonTypes.{InvariantRule, iMadzError}

object FundOrderConfirmTASharesImpl extends InvariantRule[Event, State, RecordFundTAConfirmedParams] {
  override def apply(state: State, p: RecordFundTAConfirmedParams): Either[iMadzError, List[Event]] = {
    // @cloze:start(fund-order-confirm-tashares)
    if (p.nav <= BigDecimal("0.0000")) {
      Left(iMadzError("TA_INVALID_NAV", "TA_INVALID_NAV"))
    } else {
      val exactFloor = p.shares >= 0L &&
        (BigDecimal(p.shares) * p.nav <= state.netAmount) &&
        ((BigDecimal(p.shares) + BigDecimal(1)) * p.nav > state.netAmount)
      if (!exactFloor) {
        Left(iMadzError("TA_SHARES_MISMATCH", "TA_SHARES_MISMATCH"))
      } else if (state.paymentOutcome != "succeeded") {
        Left(iMadzError("TA_PAYMENT_NOT_SUCCEEDED", "TA_PAYMENT_NOT_SUCCEEDED"))
      } else if (state.taStatus == "confirmed") {
        Left(iMadzError("TA_ALREADY_CONFIRMED", "TA_ALREADY_CONFIRMED"))
      } else {
        Right(List(FundTASharesConfirmed(p.shares, p.nav)))
      }
    }
    // @cloze:end(fund-order-confirm-tashares)
  }
}
