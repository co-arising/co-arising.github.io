package example.bankwealth.infrastructure.process

import example.bankwealth.domain.services.impl.StableOrderIdentity
import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
import example.bankwealth.application.process.cash_payment.{BankCashPaymentExecution => Cash}
import example.bankwealth.application.process.independent_refund.{BankIndependentRefundExecution => Refund}
import example.bankwealth.infrastructure.process.{BankPaymentHost => PaymentHost, BankRefundHost => RefundHost}
import example.bankwealth.application.aggregates.{FundOrderProtocol, SipPlanProtocol}
import example.bankwealth.domain.entities.{FundOrderEntity, SipPlanEntity}
import example.bankwealth.domain.invariants.params.FundOrderRuleParams
import example.bankwealth.interfaces.api.ApiAcknowledgements._
import example.bankwealth.interfaces.api.ApiCommands._
import example.bankwealth.interfaces.api.ApiKeys._
import example.bankwealth.interfaces.api.ApiResponses._
import example.bankwealth.interfaces.api.ApiWire._
import example.bankwealth.application.readmodels.ReadModelViews._
import example.bankwealth.application.process.protocol._
import example.bankwealth.application.process.protocol.BankPaymentMessages._
import example.bankwealth.application.process.protocol.BankRefundMessages._
import example.bankwealth.application.connectors._
import example.bankwealth.application.connectors.BankSipDispatchProtocol._
import example.bankwealth.application.connectors.BankTaEffectProtocol._
import example.bankwealth.domain.values._
import example.bankwealth.infrastructure.proto._
import example.bankwealth.infrastructure.persistence.converters.DomainConverters
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._

/** The caller cannot supply a terminal outcome. It is derived from the original order
  * and its correlated PB evidence, then counted by the generated plan's first-terminal fold.
  */
final class BankSipTerminalBridge(plan: ActorRef[SipPlanProtocol.Command], order: ActorRef[FundOrderProtocol.Command],
    orderPersistenceId: String, readJournal: String => Future[Vector[Any]])(implicit system: ActorSystem[_]) {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)
  def record(o: SipOccurrence): Future[Unit] = for {
    p <- plan.ask[SipPlanEntity.State](SipPlanProtocol.GetState)
    s <- order.ask[FundOrderEntity.State](FundOrderProtocol.GetState)
    events <- readJournal(orderPersistenceId)
    decodedEvents = events.collect { case raw: FundOrderEventPO => DomainConverters.decodeFundOrderEventPO(raw) }
    _ = require(p.id == o.planId && p.occurrences.get(o.dueSlot).contains(o) && s.id == o.fundOrderId && s.operationId == o.operationId &&
      s.investorAccountId == o.config.investorAccountId && s.fundCollectionAccountId == o.config.fundCollectionAccountId &&
      s.amount == o.config.amount && s.fundCode == o.config.fundCode, "terminal original occurrence association mismatch")
    expectedPayment = TxId(PaymentHost.operationIdentity(Cash.State(Cash.Inputs(o.operationId, o.operationId, o.config.investorAccountId,
      o.fundOrderId, o.config.fundCollectionAccountId, o.config.amount, o.config.fundCode, s.tenantId))))
    _ = require(s.selectedPaymentTxId.value.isEmpty || s.selectedPaymentTxId == expectedPayment,
      "terminal selected payment differs from original occurrence")
    paid = s.selectedPaymentTxId == expectedPayment && s.cashPaymentFinalResults.get(expectedPayment).contains("succeeded") && decodedEvents.exists {
      case e: FundOrderEntity.FundCashPaymentSucceeded => e.txid == expectedPayment
      case _ => false
    }
    confirmation = decodedEvents.collect { case e: FundOrderEntity.FundTASharesConfirmed => e }.find { e =>
      e.fundOrderId == o.fundOrderId && e.paymentTxId == expectedPayment && e.taRequestId == s.taRequestId &&
        e.taReference == s.taReference && e.fundCode == o.config.fundCode && e.currency == o.config.amount.currency &&
        e.shares == s.taConfirmedShares && s.taReceipts.get(e.receiptId).contains(e.receiptBody)
    }
    taConfirmed = paid && s.taStatus == "confirmed" && confirmation.nonEmpty
    taRejected = paid && s.taStatus == "rejected" && decodedEvents.exists {
      case e: FundOrderEntity.FundTARejected =>
        e.fundOrderId == o.fundOrderId && e.paymentTxId == expectedPayment && e.taRequestId == s.taRequestId &&
          e.taReference == s.taReference && e.fundCode == o.config.fundCode && e.currency == o.config.amount.currency &&
          e.reason == s.taRejectionReason && s.taReceipts.get(e.receiptId).contains(e.receiptBody)
      case _ => false
    }
    expectedRefundOperation = StableOrderIdentity.stableRefundOperationId(s, FundOrderRuleParams.RequestFundPurchaseRefundParams(o.fundOrderId, expectedPayment))
      .fold(e => throw new IllegalStateException(e.message), identity)
    expectedRefund = TxId(RefundHost.operationIdentity(Refund.State(Refund.Inputs(o.fundOrderId, expectedPayment,
      o.config.investorAccountId, o.config.fundCollectionAccountId, o.config.amount, expectedRefundOperation, s.tenantId))))
    refundRequested = taRejected && s.refundOperationId == expectedRefundOperation && decodedEvents.exists {
      case e: FundOrderEntity.FundPurchaseRefundRequested =>
        e.fundOrderId == o.fundOrderId && e.paymentTxId == expectedPayment && e.refundOperationId == s.refundOperationId &&
          e.investorAccountId == o.config.investorAccountId && e.fundCollectionAccountId == o.config.fundCollectionAccountId && e.amount == o.config.amount
      case _ => false
    }
    refunded = refundRequested && s.refundOutcome == "succeeded" && s.refundFinalResults.get(expectedRefund).contains("succeeded") && decodedEvents.exists {
      case e: FundOrderEntity.FundRefundSucceeded =>
        e.refundOperationId == s.refundOperationId && e.refundTxId == expectedRefund && s.refundResultReceipts.get(e.receiptId).contains(e.receiptBody)
      case _ => false
    }
    outcome = if (taConfirmed) Some("ta-confirmed") else if (refunded) Some("ta-rejected-refund-completed")
      else if (s.paymentOutcome == "rejected-before-effects" && s.cashPaymentFinalResults.get(expectedPayment).contains("rejected-before-effects") && decodedEvents.exists {
        case e: FundOrderEntity.FundCashPaymentRejectedBeforeEffects => e.txid == expectedPayment
        case _ => false
      }) Some("payment-rejected-before-effects")
      else if (s.paymentOutcome == "compensated" && s.cashPaymentFinalResults.get(expectedPayment).contains("compensated") && decodedEvents.exists {
        case e: FundOrderEntity.FundCashPaymentCompensated => e.txid == expectedPayment
        case _ => false
      }) Some("payment-compensated") else None
    _ = require(p.firstTerminals.get(o.occurrenceId).forall {
      case "succeeded" => taConfirmed
      case "failed" => outcome.exists(_ != "ta-confirmed")
      case _ => false
    }, "retained SIP terminal lacks matching order evidence")
    buildCommand = (outcome match {
      case Some("ta-confirmed") =>
        (r: ActorRef[SipPlanProtocol.Reply]) => SipPlanProtocol.RecordSipInstallmentSucceeded(o, "ta-confirmed", "bank-sip-terminal-v1/" + o.occurrenceId.value,
          confirmation.get.receiptBody, r)
      case Some(reason) =>
        (r: ActorRef[SipPlanProtocol.Reply]) => SipPlanProtocol.RecordSipInstallmentFailed(o, reason, "bank-sip-terminal-v1/" + o.occurrenceId.value,
          Vector(s.id.value, expectedPayment.value, reason, if (refunded) expectedRefundOperation.value else "",
            if (refunded) expectedRefund.value else "").map(x => x.length.toString + ":" + x).mkString, r)
      case None if s.cashPaymentResults.get(expectedPayment).contains("outcome-unknown") || s.taStatus == "unknown" || s.refundOutcome == "outcome-unknown" =>
        (r: ActorRef[SipPlanProtocol.Reply]) => SipPlanProtocol.RecordSipInstallmentOutcomeUnknown(o, r)
      case None if s.cashPaymentResults.get(expectedPayment).contains("recovery-required") || s.refundOutcome == "recovery-required" =>
        (r: ActorRef[SipPlanProtocol.Reply]) => SipPlanProtocol.RecordSipInstallmentRecoveryRequired(o, r)
      case None if taRejected =>
        (r: ActorRef[SipPlanProtocol.Reply]) => SipPlanProtocol.RecordSipInstallmentRefundInProgress(o, r)
      case None =>
        (r: ActorRef[SipPlanProtocol.Reply]) => SipPlanProtocol.RecordSipInstallmentPending(o, r)
    }): (ActorRef[SipPlanProtocol.Reply] => SipPlanProtocol.Command)
    // After the first terminal, revalidate evidence but never manufacture a new receipt
    // from a larger set of TA observations. Duplicate notifications produce zero events.
    _ <- if (p.firstTerminals.contains(o.occurrenceId)) Future.successful(()) else
      plan.ask[SipPlanProtocol.Reply](buildCommand).map { reply =>
        require(reply.isInstanceOf[SipPlanProtocol.Accepted], "SIP terminal refused")
      }
  } yield ()
}
