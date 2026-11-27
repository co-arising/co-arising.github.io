// Handwritten domain computations isolation zone for FundOrder.
// Delegates L2 @cloze behaviors to their dedicated *Impl objects; customize any remaining non-L1 command handlers below.
package example.bankwealth.v2.domain.services.impl

import example.bankwealth.v2.domain.entities.FundOrderEntity._
import example.bankwealth.v2.domain.invariants.params.FundOrderRuleParams._
import example.bankwealth.v2.domain.services.FundOrderComputations
import net.imadz.common.CommonTypes.iMadzError

final class FundOrderComputationsImpl extends FundOrderComputations {
  override def recordCashRequestSource(state: State, p: RecordCashRequestSourceParams): Either[iMadzError, List[Event]] = {
    Right(List(CashRequestSourceRecorded(p.principal, p.clientRequestId)))
  }

  override def requestFundPurchaseSettlement(state: State, p: RequestFundPurchaseSettlementParams): Either[iMadzError, List[Event]] = {
    Right(List(FundPurchaseSettlementRequested(p.principal, p.clientRequestId)))
  }

  override def recordFundTAConfirmed(state: State, p: RecordFundTAConfirmedParams): Either[iMadzError, List[Event]] =
    FundOrderConfirmTASharesImpl.apply(state, p)

  override def requestIndependentRefund(state: State, p: RequestIndependentRefundParams): Either[iMadzError, List[Event]] = {
    Right(List(IndependentRefundRequested(p.orderId)))
  }

}
