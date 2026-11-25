package example.bankwealth.domain.services.impl

import example.bankwealth.domain.entities.FundOrderEntity
import example.bankwealth.domain.invariants.params.FundOrderRuleParams._
import example.bankwealth.domain.services.FundOrderComputations
import example.bankwealth.domain.values.{OperationId, TaRequestId}
import net.imadz.common.CommonTypes.iMadzError
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.util.Base64

object StableOrderIdentity extends FundOrderComputations {
  private def identity(parts: String*): Either[iMadzError, String] = {
    if (parts.exists(part => part == null || part.isEmpty)) {
      Left(iMadzError("ORDER_IDENTITY_REQUIRED", "retained order identity required"))
    } else {
      val bytes = parts.foldLeft(Array.emptyByteArray) { (all, part) =>
        val value = part.getBytes(StandardCharsets.UTF_8)
        all ++ ByteBuffer.allocate(4 + value.length).putInt(value.length).put(value).array()
      }
      Right(Base64.getUrlEncoder.withoutPadding.encodeToString(bytes))
    }
  }

  def stableTaRequestId(state: FundOrderEntity.State, p: RegisterFundTASubmissionParams): Either[iMadzError, TaRequestId] =
    identity(p.fundOrderId.value, p.paymentTxId.value).map(id => TaRequestId("bank-ta-v1/" + id))

  def stableRefundOperationId(state: FundOrderEntity.State, p: RequestFundPurchaseRefundParams): Either[iMadzError, OperationId] =
    identity(p.fundOrderId.value, p.paymentTxId.value).map(id => OperationId("bank-refund-v1/" + id))
}
