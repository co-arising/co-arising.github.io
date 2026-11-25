package example.bankwealth.infrastructure.bootstrap

import akka.actor.typed.ActorRef
import example.bankwealth.application.process.cash_payment.{BankCashPaymentExecution => Cash}
import example.bankwealth.application.process.independent_refund.{BankIndependentRefundExecution => Refund}
import example.bankwealth.infrastructure.process.{BankPaymentHost => PaymentHost, BankRefundHost => RefundHost}
import example.bankwealth.application.process.ta_submission.{BankTaSubmissionExecution => Ta}
import example.bankwealth.application.process.sip_dispatch.{BankSipDispatchExecution => SipDispatch}
import example.bankwealth.infrastructure.connectors.{BankTaEffectHost => TaHost, BankSipDispatchEffectHost => SipHost}
import example.bankwealth.application.aggregates.{CreditBalanceProtocol, FundOrderProtocol, SipPlanProtocol}
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
import net.imadz.infra.saga.strict.StrictSagaCoordinator
import net.imadz.monarch.persistence.PersistentMonarch
import scala.concurrent.Future

final case class BankActorHandle[C](persistenceId: String, ref: ActorRef[C])
final case class BankCashRuntime(original: BankPaymentOriginal, transactionId: String,
  coordinator: BankActorHandle[StrictSagaCoordinator.Command], host: BankActorHandle[PaymentHost.Request],
  parent: BankActorHandle[PersistentMonarch.Command[Cash.State]])
final case class BankRefundRuntime(original: BankRefundOriginal, transactionId: String,
  coordinator: BankActorHandle[StrictSagaCoordinator.Command], host: BankActorHandle[RefundHost.Request],
  parent: BankActorHandle[PersistentMonarch.Command[Refund.State]])
final case class BankTaRuntime(request: BankTaEffectRequest, host: BankActorHandle[TaHost.Request],
  parent: BankActorHandle[PersistentMonarch.Command[Ta.State]])
final case class BankSipDispatchRuntime(occurrence: SipOccurrence, host: BankActorHandle[SipHost.Request],
  parent: BankActorHandle[PersistentMonarch.Command[SipDispatch.State]])

trait BankRuntimeDirectory extends AutoCloseable {
  def account(id: AccountId): Future[BankActorHandle[CreditBalanceProtocol.Command]]
  def order(id: FundOrderId): Future[BankActorHandle[FundOrderProtocol.Command]]
  def plan(id: PlanId): Future[BankActorHandle[SipPlanProtocol.Command]]
  def ensureCash(original: BankPaymentOriginal): Future[BankCashRuntime]
  def ensureRefund(original: BankRefundOriginal): Future[BankRefundRuntime]
  def ensureTa(request: BankTaEffectRequest): Future[BankTaRuntime]
  def ensureSipDispatch(occurrence: SipOccurrence): Future[BankSipDispatchRuntime]
}
