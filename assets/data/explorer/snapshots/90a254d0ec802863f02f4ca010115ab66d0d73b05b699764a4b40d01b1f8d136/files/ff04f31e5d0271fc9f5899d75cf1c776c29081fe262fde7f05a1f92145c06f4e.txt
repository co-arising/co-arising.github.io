package example.bankwealth.application.process.sip

import example.bankwealth.application.services.{BankPersistenceIds, BankSipApplicationService, BankTrustedAdmission}
import example.bankwealth.domain.services.impl.StableSipIdentity
import example.bankwealth.infrastructure.bootstrap.{BankActorHandle, BankRuntimeDirectory}
import example.bankwealth.infrastructure.persistence.BankJournal
import example.bankwealth.infrastructure.process.BankSipTerminalBridge
import example.bankwealth.infrastructure.security.BankDemoConfiguration
import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.stream.{Materializer, SystemMaterializer}
import akka.stream.scaladsl.Sink
import akka.util.Timeout
import example.bankwealth.application.process.sip_dispatch.{BankSipDispatchExecution => Dispatch}
import example.bankwealth.infrastructure.persistence.BankSipDispatchStateCodec
import example.bankwealth.application.aggregates.{FundOrderProtocol, SipPlanProtocol}
import example.bankwealth.domain.entities.{FundOrderEntity, SipPlanEntity}
import example.bankwealth.domain.invariants.params.SipPlanRuleParams
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
import example.bankwealth.infrastructure.security.BankDemoConfiguration
import example.bankwealth.infrastructure.bootstrap.BankServiceContract._
import net.imadz.monarch.persistence.PersistentMonarch
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._
import scala.util.control.NonFatal

/** Only orchestrates generated commands. The queue serializes calls, not financial state;
  * every retry and every new instance reads the original PB journal and generated actor.
  * Startup discovery/subscription belongs to the shared recovery assembly.
  */
final class BankSipApplication(directory: BankRuntimeDirectory, journal: BankJournal,
    config: BankDemoConfiguration, admission: BankTrustedAdmission)(implicit system: ActorSystem[_])
    extends BankSipApplicationService {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val materializer: Materializer = SystemMaterializer(system).materializer
  implicit private val timeout: Timeout = Timeout(3.seconds)
  private val ids = new BankPersistenceIds(journal.namespace)
  private var tail: Future[Unit] = Future.successful(())
  private var closed = false
  private final case class RejectedRequest(failure: Failure) extends RuntimeException(failure.code)
  private def reject(failure: Failure): Nothing = throw RejectedRequest(failure)
  private def check(condition: Boolean): Unit = if (!condition) reject(RequestConflict)
  private def validateIntent(intent: BankSipCreateIntent): Unit =
    try admission.validateSip(intent) catch { case NonFatal(_) => reject(RequestConflict) }

  private def serial[A](body: => Future[A]): Future[Outcome[A]] = synchronized {
    if (closed) Future.successful(Left(Unavailable))
    else {
      val result = tail.flatMap(_ => body).map[Outcome[A]](Right(_)).recover {
        case RejectedRequest(error) => Left(error)
        case NonFatal(_) => Left(Unavailable)
      }
      tail = result.map(_ => ())
      result
    }
  }

  private def execute(handle: BankActorHandle[SipPlanProtocol.Command], build: ActorRef[SipPlanProtocol.Reply] => SipPlanProtocol.Command): Future[Unit] =
    handle.ref.ask[SipPlanProtocol.Reply](build).map {
      case _: SipPlanProtocol.Accepted => ()
      case _: SipPlanProtocol.Refused => reject(RequestConflict)
    }
  private def state(handle: BankActorHandle[SipPlanProtocol.Command]): Future[SipPlanEntity.State] =
    handle.ref.ask[SipPlanEntity.State](SipPlanProtocol.GetState)

  private def original(pid: String): Future[Option[BankSipCreateIntent]] = journal.readPb(pid).map { events =>
    val intents = events.collect { case raw: SipPlanEventPO => DomainConverters.decodeSipPlanEventPO(raw) }.collect {
      case event: SipPlanEntity.SipCreateIntentRecorded =>
        val intent = admission.toSipCreateIntent(event.intent)
        validateIntent(intent)
        check(event.source.contains(event.intent) && pid == ids.plan(event.intent.planId))
        intent
    }
    check(intents.distinct.size <= 1)
    intents.headOption
  }

  // Read trusted ownership evidence BEFORE obtaining the plan actor/state. Never derive a
  // client-supplied planId from a guessed requestId, nor trust its investor field as ownership.
  private def owned(principal: Principal, planId: PlanId): Future[(BankActorHandle[SipPlanProtocol.Command], BankSipCreateIntent)] = {
    val customer = config.customer(principal).getOrElse(reject(NotAuthorized))
    val pid = try ids.plan(planId) catch { case NonFatal(_) => reject(InvalidRequest) }
    original(pid).flatMap {
      case None => reject(MissingResource)
      case Some(intent) if intent.principalId != customer.id => reject(NotAuthorized)
      case Some(intent) => handle(intent).map(_ -> intent)
    }
  }
  private def handle(intent: BankSipCreateIntent): Future[BankActorHandle[SipPlanProtocol.Command]] =
    directory.plan(intent.planId).map { h => check(h.persistenceId == ids.plan(intent.planId)); h }

  /** Membership is insufficient: validate the positional prefix and the inverse persisted
    * index before even Create/Append/Seal. Do not reset revisions or any occurrence progress.
    */
  private def validatePrefix(s: SipPlanEntity.State, intent: BankSipCreateIntent): Unit = {
    validateIntent(intent)
    val due = intent.request.dueSlots
    val expected = admission.toSipOrigination(intent)
    check(s.id == intent.planId && s.createIntent.contains(expected) && s.sipCreateIntents.get("original").contains(expected))
    check(s.createIntentDueSlots == due && s.scheduleCount >= 0L && s.scheduleCount <= due.size.toLong)
    val prefix = due.take(s.scheduleCount.toInt).zipWithIndex.map { case (slot, position) => position.toLong -> slot }.toMap
    check(s.slots == prefix && s.intentAppendedDueSlots == prefix.map { case (position, slot) => slot -> position })
    check(s.lastDueSlot == due.take(s.scheduleCount.toInt).lastOption.getOrElse(-1L))
    check(!s.scheduleSealed || s.scheduleCount == due.size.toLong)
    if (s.initialized) {
      check(s.revisions.get(intent.config.revision).contains(intent.config))
      check(s.revisions.forall { case (revision, c) =>
        revision == c.revision && c.revision.value.nonEmpty && c.effectiveSlot >= 0 &&
          c.investorAccountId == intent.config.investorAccountId && c.amount.currency == "CNY" && c.amount.amount > 0 &&
          config.fund(c.fundCode).exists(f => f.collectionAccountId == c.fundCollectionAccountId && f.collectionAccountId != c.investorAccountId)
      })
    } else check(s.scheduleCount == 0L && !s.scheduleSealed && s.revisions.isEmpty && s.occurrences.isEmpty)
  }

  private def restoreSchedule(h: BankActorHandle[SipPlanProtocol.Command], intent: BankSipCreateIntent): Future[SipPlanEntity.State] = for {
    before <- state(h)
    _ = validatePrefix(before, intent)
    _ <- execute(h, SipPlanProtocol.CreateSipPlan(intent.planId, intent.config, _))
    _ <- intent.request.dueSlots.zipWithIndex.drop(before.scheduleCount.toInt).foldLeft(Future.successful(())) {
      case (previous, (slot, position)) => previous.flatMap(_ => execute(h, SipPlanProtocol.AppendSipDueSlot(position.toLong, slot, _)))
    }
    complete <- state(h)
    _ = validatePrefix(complete, intent)
    _ = check(complete.scheduleCount == intent.request.dueSlots.size.toLong)
    _ <- execute(h, SipPlanProtocol.SealSipSchedule(_))
    sealedState <- state(h)
    _ = validatePrefix(sealedState, intent)
    _ = check(sealedState.scheduleSealed)
  } yield sealedState

  def create(principal: Principal, request: BankSipCreate): Future[Outcome[BankSipAcknowledgement]] = serial {
    admission.sip(principal, request) match {
      case Left(error) => reject(error)
      case Right(intent) => for {
        h <- handle(intent)
        origination = admission.toSipOrigination(intent)
        _ <- execute(h, SipPlanProtocol.RecordSipCreateIntent(origination, Some(origination), _))
        persisted <- original(h.persistenceId)
        _ = check(persisted.contains(intent))
        _ <- restoreSchedule(h, intent)
      } yield BankSipAcknowledgement(intent.planId, "accepted")
    }
  }

  def revise(principal: Principal, input: BankSipRevisionInput): Future[Outcome[BankSipAcknowledgement]] = serial {
    for {
      pair <- owned(principal, input.planId)
      (h, intent) = pair
      _ <- restoreSchedule(h, intent)
      customer = config.customer(principal).getOrElse(reject(NotAuthorized))
      fund = config.fund(input.request.fundCode).getOrElse(reject(InvalidRequest))
      revised = try {
        val amount = DomainConverters.MoneyFromWire(input.request.amount)
        if (amount.currency != "CNY" || amount.amount <= 0 || customer.accountId == fund.collectionAccountId ||
            input.request.revision.value.isEmpty || input.request.effectiveSlot < 0) reject(InvalidRequest)
        SipRevisionConfig(input.request.revision, input.request.effectiveSlot, customer.accountId,
          fund.collectionAccountId, fund.code, amount)
      } catch { case r: RejectedRequest => throw r; case NonFatal(_) => reject(InvalidRequest) }
      _ <- execute(h, SipPlanProtocol.ReviseSipPlan(revised, _))
    } yield BankSipAcknowledgement(intent.planId, "accepted")
  }

  def pause(principal: Principal, key: BankPlanKey): Future[Outcome[BankSipAcknowledgement]] = serial {
    for {
      pair <- owned(principal, key.planId)
      (h, intent) = pair
      s <- restoreSchedule(h, intent)
      // No guessed wall clock: pause at the last generated durable business tick.
      _ <- execute(h, SipPlanProtocol.PauseSipPlan(if (s.paused) s.pauseTick else s.currentTick, _))
      _ <- classify(h)
    } yield BankSipAcknowledgement(intent.planId, "paused")
  }

  def resume(principal: Principal, key: BankPlanKey): Future[Outcome[BankSipAcknowledgement]] = serial {
    for {
      pair <- owned(principal, key.planId)
      (h, intent) = pair
      _ <- restoreSchedule(h, intent)
      _ <- classify(h) // Classify the entire elapsed paused interval BEFORE resuming.
      s <- state(h)
      _ <- execute(h, SipPlanProtocol.ResumeSipPlan(s.currentTick, _))
      _ <- drive(h)
    } yield BankSipAcknowledgement(intent.planId, "active")
  }

  def tick(principal: Principal, request: BankTick): Future[Outcome[BankTickAcknowledgement]] = serial {
    if (!config.operator(principal)) reject(NotAuthorized)
    if (request.slot < 0L) reject(InvalidRequest)
    for {
      pids <- journal.persistenceIds().filter(_.startsWith(ids.prefix + "plan/")).runWith(Sink.seq)
      intents <- pids.distinct.sorted.foldLeft(Future.successful(Vector.empty[BankSipCreateIntent])) { (previous, pid) =>
        previous.flatMap(found => original(pid).map(found ++ _.toVector))
      }
      // Preflight ALL plan clocks before mutating any: a lower repeated tick is a conflict,
      // including after application restart. Partial fanout is safely completed by replay.
      plans <- intents.foldLeft(Future.successful(Vector.empty[(BankActorHandle[SipPlanProtocol.Command], BankSipCreateIntent)])) {
        (previous, intent) => previous.flatMap(found => handle(intent).flatMap(h => state(h).map { s =>
          validatePrefix(s, intent)
          if (request.slot < s.currentTick) reject(RequestConflict)
          found :+ (h -> intent)
        }))
      }
      _ <- plans.foldLeft(Future.successful(())) { case (previous, (h, intent)) => previous.flatMap { _ => for {
        _ <- restoreSchedule(h, intent)
        _ <- execute(h, SipPlanProtocol.AdvanceSipClock(request.slot, _))
        _ <- classify(h)
        _ <- trigger(h)
      } yield () } }
      _ <- attemptAll(plans.map { case (h, _) => () => replayOccurrences(h) })
    } yield BankTickAcknowledgement(request.slot, plans.size.toLong)
  }

  /** Called by main's journal startup scan/continuous driver. No HTTP ingress. */
  def recoverExisting(planId: PlanId): Future[Outcome[Unit]] = serial {
    original(ids.plan(planId)).flatMap {
      case None => reject(MissingResource)
      case Some(intent) => for {
        h <- handle(intent)
        _ <- restoreSchedule(h, intent)
        _ <- drive(h)
      } yield ()
    }
  }

  private def classify(h: BankActorHandle[SipPlanProtocol.Command]): Future[Unit] = state(h).flatMap { s =>
    s.slots.get(s.observedCount) match {
      case Some(slot) if slot <= s.currentTick =>
        val buildCommand: ActorRef[SipPlanProtocol.Reply] => SipPlanProtocol.Command =
          if (s.paused && slot >= s.pauseTick) SipPlanProtocol.SkipPausedSipDueSlot(s.observedCount, slot, _)
          else SipPlanProtocol.ObserveSipDueSlot(s.observedCount, slot, _)
        execute(h, buildCommand).flatMap(_ => classify(h))
      case _ => Future.successful(())
    }
  }

  private def trigger(h: BankActorHandle[SipPlanProtocol.Command]): Future[Unit] = state(h).flatMap { s =>
    s.slots.get(s.startCount) match {
      case Some(slot) if s.slotDisposition.get(slot).contains("skipped") =>
        execute(h, SipPlanProtocol.AdvanceSkippedSipSlot(s.startCount, slot, _)).flatMap(_ => trigger(h))
      case Some(slot) if !s.paused && s.slotDisposition.get(slot).contains("backlog") =>
        val candidates = s.revisions.values.filter(c => c.effectiveSlot <= slot && s.revisionEnds.get(c.revision).forall(slot < _)).toVector
        check(candidates.size == 1)
        val c = candidates.head
        execute(h, SipPlanProtocol.TriggerSipInstallment(s.startCount, slot, c.revision, c, _)).flatMap(_ => trigger(h))
      case _ => Future.successful(())
    }
  }

  private def drive(h: BankActorHandle[SipPlanProtocol.Command]): Future[Unit] =
    classify(h).flatMap(_ => trigger(h)).flatMap(_ => replayOccurrences(h))

  // Attempt the next due occurrence even if another dispatch is unavailable/unknown.
  // Start acknowledgement is enough: never await cash completion or the prior TA terminal.
  private def attemptAll(work: Vector[() => Future[Unit]]): Future[Unit] =
    work.foldLeft(Future.successful(Option.empty[Throwable])) { (previous, next) =>
      previous.flatMap(error => Future.unit.flatMap(_ => next()).map(_ => error).recover {
        case NonFatal(e) => error.orElse(Some(e))
      })
    }.flatMap { case Some(error) => Future.failed(error); case None => Future.successful(()) }

  private def replayOccurrences(h: BankActorHandle[SipPlanProtocol.Command]): Future[Unit] = state(h).flatMap { s =>
    attemptAll(s.occurrences.toVector.sortBy(_._1).map { case (_, o) => () => {
      val start = if (s.firstTerminals.contains(o.occurrenceId)) Future.successful(()) else dispatch(h, o)
      start.flatMap(_ => terminal(h, o))
    } })
  }

  private def verifyOccurrence(h: BankActorHandle[SipPlanProtocol.Command], o: SipOccurrence): Future[Unit] = for {
    persisted <- original(h.persistenceId)
    intent = persisted.getOrElse(reject(MissingResource))
    s <- state(h)
    _ = validatePrefix(s, intent)
    _ = check(s.id == o.planId && s.occurrences.get(o.dueSlot).contains(o) && s.scheduleSealed)
    position = s.slots.collectFirst { case (p, slot) if slot == o.dueSlot => p }.getOrElse(reject(RequestConflict))
    expected = StableSipIdentity.stableSipOccurrence(s, SipPlanRuleParams.TriggerSipInstallmentParams(position, o.dueSlot, o.revision, o.config))
    _ = check(expected.contains(o) && s.revisions.get(o.revision).contains(o.config) &&
      o.dueSlot >= o.config.effectiveSlot && s.revisionEnds.get(o.revision).forall(o.dueSlot < _))
    events <- journal.readPb(h.persistenceId)
    _ = check(events.exists {
      case raw: SipPlanEventPO => DomainConverters.decodeSipPlanEventPO(raw) match {
        case e: SipPlanEntity.SipInstallmentTriggered => e.position == position && e.occurrence == o
        case _ => false
      }
      case _ => false
    })
  } yield ()

  private def dispatch(h: BankActorHandle[SipPlanProtocol.Command], o: SipOccurrence): Future[Unit] = for {
    _ <- verifyOccurrence(h, o) // Persisted occurrence BEFORE graph/cash/dispatch creation.
    runtime <- directory.ensureSipDispatch(o)
    _ = check(runtime.occurrence == o && runtime.parent.persistenceId == ids.sipRun(o.occurrenceId) && runtime.host.persistenceId == ids.sipHost(o.occurrenceId))
    input = Dispatch.State(Dispatch.Inputs(o.occurrenceId, o))
    before <- journal.readAll(runtime.parent.persistenceId)
    starts = before.collect { case e: PersistentMonarch.RunStarted => e }
    _ = check(starts.isEmpty || (starts.size == 1 && matchingStart(starts.head, o, input)))
    _ <- if (starts.nonEmpty) Future.successful(()) else runtime.parent.ref.ask[PersistentMonarch.RunReply](r =>
      PersistentMonarch.StartRun[Dispatch.State](o.occurrenceId.value, input, r)).flatMap { reply =>
        journal.readAll(runtime.parent.persistenceId).map { events =>
          val retained = events.collect { case e: PersistentMonarch.RunStarted => e }
          check(retained.size == 1 && matchingStart(retained.head, o, input))
          reply match {
            case PersistentMonarch.Accepted(id) => check(id == o.occurrenceId.value)
            // Lost acknowledgement or concurrent replay: exact original durable start only.
            case PersistentMonarch.Rejected(id, _) => check(id == o.occurrenceId.value)
          }
        }
      }
  } yield ()

  private def matchingStart(e: PersistentMonarch.RunStarted, o: SipOccurrence, input: Dispatch.State): Boolean =
    // The pinned Monarch artifact persists stageName#index, not the execution's stage name alone.
    e.runId == o.occurrenceId.value && e.stageCursors == Vector("dispatch-cash#0") &&
      java.util.Arrays.equals(e.initialSnapshot, BankSipDispatchStateCodec.codec.encode(input))

  def recordTerminal(occurrence: SipOccurrence): Future[Outcome[Unit]] = serial {
    original(ids.plan(occurrence.planId)).flatMap {
      case None => reject(MissingResource)
      case Some(intent) => handle(intent).flatMap(h => verifyOccurrence(h, occurrence).flatMap(_ => terminal(h, occurrence)))
    }
  }
  private def terminal(h: BankActorHandle[SipPlanProtocol.Command], o: SipOccurrence): Future[Unit] = for {
    order <- directory.order(o.fundOrderId)
    _ = check(order.persistenceId == ids.order(o.fundOrderId))
    s <- order.ref.ask[FundOrderEntity.State](FundOrderProtocol.GetState)
    // A persisted occurrence may precede its original order. It is not a business failure.
    _ <- if (s.status == "new") state(h).map { p =>
      check(!p.firstTerminals.contains(o.occurrenceId))
    } else new BankSipTerminalBridge(h.ref, order.ref, order.persistenceId, pid => journal.readAll(pid)).record(o)
  } yield ()

  def close(): Unit = synchronized { closed = true } // Directory/journal belong to main.
}
