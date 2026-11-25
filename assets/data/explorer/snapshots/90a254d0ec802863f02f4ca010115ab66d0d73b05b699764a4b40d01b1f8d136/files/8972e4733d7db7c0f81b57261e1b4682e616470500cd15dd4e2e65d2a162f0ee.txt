package example.bankwealth.infrastructure.connectors

import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
import example.bankwealth.application.process.cash_payment.{BankCashPaymentExecution => Cash}
import example.bankwealth.application.process.sip_dispatch.{BankSipDispatchExecution => Dispatch}
import example.bankwealth.infrastructure.connectors.{BankSipDispatchEffectHost => Host}
import example.bankwealth.infrastructure.persistence.BankCashPaymentStateCodec
import example.bankwealth.application.aggregates.{FundOrderProtocol, SipPlanProtocol}
import example.bankwealth.domain.entities.{FundOrderEntity, SipPlanEntity}
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
import example.bankwealth.infrastructure.proto.SipPlanEventPO
import example.bankwealth.infrastructure.persistence.converters.DomainConverters
import net.imadz.monarch.persistence.PersistentMonarch
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._

final class BankSipDispatchBindings(plan: ActorRef[SipPlanProtocol.Command], planPersistenceId: String,
    order: ActorRef[FundOrderProtocol.Command], cash: ActorRef[PersistentMonarch.Command[Cash.State]], cashPersistenceId: String,
    readJournal: String => Future[Vector[Any]])(implicit system: ActorSystem[_]) {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)
  private def cashState(o: SipOccurrence): Cash.State = Cash.State(Cash.Inputs(o.operationId, o.operationId,
    o.config.investorAccountId, o.fundOrderId, o.config.fundCollectionAccountId, o.config.amount, o.config.fundCode, TenantId("bankwealth")))
  private def verify(operation: BankSipDispatchOperation): Future[SipOccurrence] = {
    val o = operation.request.occurrence
    require(operation.request.occurrenceId == o.occurrenceId && operation.operation == Host.operationIdentity(Dispatch.State(Dispatch.Inputs(o.occurrenceId, o))), "SIP dispatch operation mismatch")
    for {
      s <- plan.ask[SipPlanEntity.State](SipPlanProtocol.GetState)
      events <- readJournal(planPersistenceId)
      _ = require(s.id == o.planId && s.occurrences.get(o.dueSlot).contains(o), "SIP original occurrence missing or changed")
      _ = require(events.exists {
        case p: SipPlanEventPO => DomainConverters.decodeSipPlanEventPO(p) match {
          case e: SipPlanEntity.SipInstallmentTriggered => e.occurrence == o
          case _ => false
        }
        case _ => false
      }, "SIP dispatch requires original persisted occurrence event")
    } yield o
  }
  private def started(o: SipOccurrence): Future[Boolean] = readJournal(cashPersistenceId).map(_.exists {
    case p: PersistentMonarch.RunStarted => p.runId == o.operationId.value && java.util.Arrays.equals(p.initialSnapshot, BankCashPaymentStateCodec.codec.encode(cashState(o)))
    case _ => false
  })
  private def observed(op: BankSipDispatchOperation): Future[Option[BankSipDispatchObservation]] = for {
    o <- verify(op)
    state <- order.ask[FundOrderEntity.State](FundOrderProtocol.GetState)
    exists <- started(o)
  } yield {
    require(state.id == o.fundOrderId, "SIP destination differs from original")
    if (state.status == "new" || !exists) None
    else {
      require(state.operationId == o.operationId && state.investorAccountId == o.config.investorAccountId &&
        state.fundCollectionAccountId == o.config.fundCollectionAccountId && state.amount == o.config.amount && state.fundCode == o.config.fundCode, "SIP cash request conflict")
      Some(BankSipDispatchObservation(op.operation, op.request, "confirmed", "bank-sip-dispatch-v1/" + cashPersistenceId,
        Some(BankSipDispatchResult(o.operationId))))
    }
  }
  private def execute(op: BankSipDispatchOperation): Future[BankSipDispatchObservation] = for {
    o <- verify(op)
    reply <- order.ask[FundOrderProtocol.Reply](FundOrderProtocol.RequestFundPurchaseSettlement(
      o.operationId, o.fundOrderId, TenantId("bankwealth"), o.config.investorAccountId, o.config.fundCollectionAccountId, o.config.fundCode, o.config.amount, _))
    _ = require(reply.isInstanceOf[FundOrderProtocol.Accepted], "SIP cash request rejected")
    _ <- cash.ask[PersistentMonarch.RunReply](r => PersistentMonarch.StartRun(o.operationId.value, cashState(o), r))
    proof <- observed(op)
  } yield proof.getOrElse(throw new IllegalStateException("cash run has no matching durable start"))
  val installed: Host.Installed = Host.install(Host.Bindings(
    execute = Host.EffectBinding("bankwealth.BankSipDispatchExecute", "bank-v1-1", execute),
    query = Host.EffectBinding("bankwealth.BankSipDispatchQuery", "bank-v1-1", observed),
    reconcile = Host.EffectBinding("bankwealth.BankSipDispatchReconcilePort", "bank-v1-1", (_: BankSipDispatchReconcile) => Future.successful(false))))
}
