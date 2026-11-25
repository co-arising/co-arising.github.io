package example.bankwealth.infrastructure.bootstrap

import example.bankwealth.application.services.BankPersistenceIds
import example.bankwealth.domain.services.impl.{BankBalanceComputations, StableOrderIdentity, StableSipIdentity}
import example.bankwealth.infrastructure.connectors.BankSipDispatchBindings
import example.bankwealth.infrastructure.persistence.BankJournal
import example.bankwealth.infrastructure.process.{BankPaymentBindings, BankRefundBindings}
import akka.actor.typed.{ActorRef, ActorSystem, Behavior}
import akka.actor.typed.scaladsl.AskPattern._
import akka.actor.typed.scaladsl.adapter._
import akka.util.Timeout
import example.bankwealth.application.process.cash_payment.{BankCashPaymentExecution => Cash}
import example.bankwealth.application.process.independent_refund.{BankIndependentRefundExecution => Refund}
import example.bankwealth.infrastructure.process.{BankPaymentHost => PaymentHost, BankRefundHost => RefundHost}
import example.bankwealth.application.process.ta_submission.{BankTaSubmissionExecution => Ta}
import example.bankwealth.application.process.sip_dispatch.{BankSipDispatchExecution => Dispatch}
import example.bankwealth.infrastructure.connectors.{BankTaEffectHost => TaHost, BankSipDispatchEffectHost => SipHost}
import example.bankwealth.infrastructure.bootstrap.{BankPaymentProcessBootstrap => PaymentBootstrap,
  BankRefundProcessBootstrap => RefundBootstrap, BankTaEffectBootstrap => TaBootstrap,
  BankSipDispatchEffectBootstrap => SipBootstrap}
import example.bankwealth.application.aggregates.{CreditBalanceProtocol, FundOrderProtocol, SipPlanProtocol}
import example.bankwealth.domain.entities.{CreditBalanceEntity, FundOrderEntity, SipPlanEntity}
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
import net.imadz.infra.saga.strict._
import net.imadz.monarch.persistence.RunObserver
import scala.collection.mutable
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._

final class BankRuntime(
    namespace: String,
    journal: BankJournal,
    reconcileAuthorizer: ReconcileAuthorizer,
    taBindings: ActorRef[FundOrderProtocol.Command] => TaHost.Installed
)(implicit system: ActorSystem[_]) extends BankRuntimeDirectory {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)
  private val ids = new BankPersistenceIds(namespace)
  require(journal.namespace == namespace && reconcileAuthorizer != null && taBindings != null)
  private val actors = mutable.ArrayBuffer.empty[ActorRef[_]]
  private val activePersistenceIds = mutable.Set.empty[String]
  private val accounts = mutable.Map.empty[AccountId, BankActorHandle[CreditBalanceProtocol.Command]]
  private val orders = mutable.Map.empty[FundOrderId, BankActorHandle[FundOrderProtocol.Command]]
  private val plans = mutable.Map.empty[PlanId, BankActorHandle[SipPlanProtocol.Command]]
  private val cashRuns = mutable.Map.empty[OperationId, Future[BankCashRuntime]]
  private val refundRuns = mutable.Map.empty[OperationId, Future[BankRefundRuntime]]
  private val taRuns = mutable.Map.empty[TaRequestId, Future[BankTaRuntime]]
  private val dispatchRuns = mutable.Map.empty[OccurrenceId, Future[BankSipDispatchRuntime]]
  private var closed = false

  private def spawn[C](pid: String, behavior: Behavior[C]): BankActorHandle[C] = synchronized {
    require(!closed, "runtime directory is closed")
    val name = "bank-" + java.security.MessageDigest.getInstance("SHA-256").digest(pid.getBytes(java.nio.charset.StandardCharsets.UTF_8)).map(b => f"${b & 0xff}%02x").mkString
    val ref = system.systemActorOf(behavior, name)
    actors += ref
    activePersistenceIds += pid
    BankActorHandle(pid, ref)
  }
  def account(id: AccountId): Future[BankActorHandle[CreditBalanceProtocol.Command]] = synchronized {
    require(!closed)
    val handle = accounts.getOrElseUpdate(id, {
      val pid = ids.account(id)
      spawn(pid, example.bankwealth.infrastructure.bootstrap.CreditBalanceBootstrap.create(pid, CreditBalanceEntity.empty(id), BankBalanceComputations))
    })
    Future.successful(handle)
  }
  def order(id: FundOrderId): Future[BankActorHandle[FundOrderProtocol.Command]] = synchronized {
    require(!closed)
    val handle = orders.getOrElseUpdate(id, {
      val pid = ids.order(id)
      spawn(pid, example.bankwealth.infrastructure.bootstrap.FundOrderBootstrap.create(pid, FundOrderEntity.empty(id), StableOrderIdentity,
        new FundOrderProtocol.ExternalAuthority { def authorize(producer: String, authorization: String, identity: Vector[String]): Boolean = false }))
    })
    Future.successful(handle)
  }
  def plan(id: PlanId): Future[BankActorHandle[SipPlanProtocol.Command]] = synchronized {
    require(!closed)
    val handle = plans.getOrElseUpdate(id, {
      val pid = ids.plan(id)
      spawn(pid, example.bankwealth.infrastructure.bootstrap.SipPlanBootstrap.create(pid, SipPlanEntity.empty(id), StableSipIdentity))
    })
    Future.successful(handle)
  }
  private def cached[K, V](map: mutable.Map[K, Future[V]], key: K, graphPid: String)(create: => Future[V]): Future[V] = synchronized {
    require(!closed)
    map.get(key) match {
      case Some(existing) => existing
      case None =>
        val result = create
        map.put(key, result)
        result.failed.foreach { _ => synchronized {
          // A partially constructed graph retains its writer lock; a pre-graph read failure can retry.
          if (!activePersistenceIds(graphPid) && map.get(key).contains(result)) map.remove(key)
        }}
        result
    }
  }
  private def verifyPayment(state: FundOrderEntity.State, original: BankPaymentOriginal): Unit = {
    require(state.id == original.fundOrderId && state.status != "new" && state.operationId == original.operationId &&
      state.investorAccountId == original.investorAccountId && state.fundCollectionAccountId == original.fundCollectionAccountId &&
      state.amount == original.amount && state.fundCode == original.fundCode, "cash graph requires retained complete original settlement")
  }
  def ensureCash(original: BankPaymentOriginal): Future[BankCashRuntime] = cached(cashRuns, original.operationId, ids.paymentSaga(original.operationId)) {
    for {
      investor <- account(original.investorAccountId)
      collection <- account(original.fundCollectionAccountId)
      destination <- order(original.fundOrderId)
      state <- destination.ref.ask[FundOrderEntity.State](FundOrderProtocol.GetState)
      _ = verifyPayment(state, original)
    } yield synchronized {
      var coordinator: ActorRef[StrictSagaCoordinator.Command] = null
      val bindings = new BankPaymentBindings(original, investor.ref, investor.persistenceId, collection.ref, collection.persistenceId,
        destination.ref, destination.persistenceId, journal.readPb(_), () => coordinator)
      val saga = spawn(ids.paymentSaga(original.operationId), PaymentBootstrap.coordinatorBehavior(ids.paymentSaga(original.operationId), PaymentBootstrap.portsFromTechnical(bindings.installed), reconcileAuthorizer))
      coordinator = saga.ref
      val host = spawn(ids.paymentHost(original.operationId), PaymentBootstrap.hostBehavior(ids.paymentHost(original.operationId), saga.ref, bindings.installed))
      val parent = spawn(ids.paymentRun(original.operationId), PaymentBootstrap.executionBehavior(ids.paymentRun(original.operationId), PaymentBootstrap.install(host.ref), new RunObserver[Cash.State] {}))
      BankCashRuntime(original, bindings.operationId, saga, host, parent)
    }
  }.map { value => require(value.original == original, "same cash identity has conflicting body"); value }

  def ensureRefund(original: BankRefundOriginal): Future[BankRefundRuntime] = cached(refundRuns, original.refundOperationId, ids.refundSaga(original.refundOperationId)) {
    for {
      investor <- account(original.investorAccountId)
      collection <- account(original.fundCollectionAccountId)
      destination <- order(original.fundOrderId)
      state <- destination.ref.ask[FundOrderEntity.State](FundOrderProtocol.GetState)
      _ = require(state.id == original.fundOrderId && state.selectedPaymentTxId == original.paymentTxId && state.refundOperationId == original.refundOperationId &&
        state.investorAccountId == original.investorAccountId && state.fundCollectionAccountId == original.fundCollectionAccountId && state.amount == original.amount,
        "refund graph requires retained original refund intent")
    } yield synchronized {
      var coordinator: ActorRef[StrictSagaCoordinator.Command] = null
      val bindings = new BankRefundBindings(original, investor.ref, investor.persistenceId, collection.ref, collection.persistenceId,
        destination.ref, destination.persistenceId, journal.readPb(_), () => coordinator)
      val saga = spawn(ids.refundSaga(original.refundOperationId), RefundBootstrap.coordinatorBehavior(ids.refundSaga(original.refundOperationId), RefundBootstrap.portsFromTechnical(bindings.installed), reconcileAuthorizer))
      coordinator = saga.ref
      val host = spawn(ids.refundHost(original.refundOperationId), RefundBootstrap.hostBehavior(ids.refundHost(original.refundOperationId), saga.ref, bindings.installed))
      val parent = spawn(ids.refundRun(original.refundOperationId), RefundBootstrap.executionBehavior(ids.refundRun(original.refundOperationId), RefundBootstrap.install(host.ref), new RunObserver[Refund.State] {}))
      BankRefundRuntime(original, bindings.operationId, saga, host, parent)
    }
  }.map { value => require(value.original == original, "same refund identity has conflicting body"); value }

  def ensureTa(request: BankTaEffectRequest): Future[BankTaRuntime] = cached(taRuns, request.taRequestId, ids.taHost(request.taRequestId)) {
    for {
      destination <- order(request.fundOrderId)
      state <- destination.ref.ask[FundOrderEntity.State](FundOrderProtocol.GetState)
      _ = require(state.taRequestId == request.taRequestId && state.selectedPaymentTxId == request.paymentTxId && state.cashPaymentFinalResults.get(request.paymentTxId).contains("succeeded"), "TA graph requires original paid submission")
    } yield synchronized {
      val host = spawn(ids.taHost(request.taRequestId), TaBootstrap.hostBehavior(ids.taHost(request.taRequestId), taBindings(destination.ref)))
      val parent = spawn(ids.taRun(request.taRequestId), TaBootstrap.executionBehavior(ids.taRun(request.taRequestId), TaBootstrap.install(host.ref), new RunObserver[Ta.State] {}))
      BankTaRuntime(request, host, parent)
    }
  }.map { value => require(value.request == request, "same TA identity has conflicting body"); value }

  def ensureSipDispatch(occurrence: SipOccurrence): Future[BankSipDispatchRuntime] = cached(dispatchRuns, occurrence.occurrenceId, ids.sipHost(occurrence.occurrenceId)) {
    for {
      source <- plan(occurrence.planId)
      state <- source.ref.ask[SipPlanEntity.State](SipPlanProtocol.GetState)
      _ = require(state.occurrences.get(occurrence.dueSlot).contains(occurrence), "dispatch graph requires retained occurrence")
      destination <- order(occurrence.fundOrderId)
      original = BankPaymentOriginal(occurrence.operationId, occurrence.fundOrderId, occurrence.config.investorAccountId,
        occurrence.config.fundCollectionAccountId, occurrence.config.fundCode, occurrence.config.amount)
      reply <- destination.ref.ask[FundOrderProtocol.Reply](FundOrderProtocol.RequestFundPurchaseSettlement(original.operationId,
        original.fundOrderId, original.investorAccountId, original.fundCollectionAccountId, original.fundCode, original.amount, _))
      _ = require(reply.isInstanceOf[FundOrderProtocol.Accepted], "persisted occurrence settlement rejected")
      cash <- ensureCash(original)
    } yield synchronized {
      val bindings = new BankSipDispatchBindings(source.ref, source.persistenceId, destination.ref, cash.parent.ref, cash.parent.persistenceId, journal.readAll(_))
      val host = spawn(ids.sipHost(occurrence.occurrenceId), SipBootstrap.hostBehavior(ids.sipHost(occurrence.occurrenceId), bindings.installed))
      val parent = spawn(ids.sipRun(occurrence.occurrenceId), SipBootstrap.executionBehavior(ids.sipRun(occurrence.occurrenceId), SipBootstrap.install(host.ref), new RunObserver[Dispatch.State] {}))
      BankSipDispatchRuntime(occurrence, host, parent)
    }
  }.map { value => require(value.occurrence == occurrence, "same dispatch identity has conflicting body"); value }

  def close(): Unit = synchronized {
    if (!closed) {
      closed = true
      accounts.clear()
      orders.clear()
      plans.clear()
      val termination = actors.reverseIterator.map(ref => akka.pattern.gracefulStop(ref.toClassic, 10.seconds, akka.actor.PoisonPill)).toVector
      scala.concurrent.Await.result(Future.sequence(termination), 15.seconds)
      actors.clear()
    }
  }
}
