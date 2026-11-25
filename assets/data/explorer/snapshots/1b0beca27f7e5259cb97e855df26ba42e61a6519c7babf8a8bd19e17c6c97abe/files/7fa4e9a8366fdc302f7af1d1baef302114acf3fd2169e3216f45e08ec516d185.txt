package example.bankwealth.infrastructure.process

import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
import example.bankwealth.application.process.cash_payment.{BankCashPaymentExecution => Execution, BankPaymentSagaDefinition => Definition, BankPaymentPorts}
import example.bankwealth.infrastructure.process.{BankPaymentHost => Host}
import example.bankwealth.application.process.cash_payment.BankPaymentPorts.{CompletionContext, OperationNotExecuted}
import example.bankwealth.infrastructure.bootstrap.{BankPaymentPortBindings => Technical, BankPaymentProcessBootstrap => ProcessBootstrap}
import example.bankwealth.infrastructure.persistence.BankPaymentProcessCodecs
import example.bankwealth.application.aggregates.{CreditBalanceProtocol, FundOrderProtocol}
import example.bankwealth.domain.entities.{CreditBalanceEntity, FundOrderEntity}
import example.bankwealth.interfaces.api.ApiAcknowledgements._
import example.bankwealth.interfaces.api.ApiCommands._
import example.bankwealth.interfaces.api.ApiKeys._
import example.bankwealth.interfaces.api.ApiResponses._
import example.bankwealth.interfaces.api.ApiWire._
import example.bankwealth.application.readmodels.ReadModelViews._
import example.bankwealth.application.process.protocol._
import example.bankwealth.application.process.protocol.BankPaymentMessages._
import example.bankwealth.application.process.protocol.BankRefundMessages._
import example.bankwealth.application.process.protocol.CreditFundCollectionStep._
import example.bankwealth.application.process.protocol.ReserveCashFundOrderStep._
import example.bankwealth.application.process.protocol.ReserveInvestorFundsStep._
import example.bankwealth.application.connectors._
import example.bankwealth.application.connectors.BankSipDispatchProtocol._
import example.bankwealth.application.connectors.BankTaEffectProtocol._
import example.bankwealth.domain.values._
import example.bankwealth.infrastructure.proto._
import example.bankwealth.infrastructure.persistence.converters.DomainConverters
import net.imadz.infra.saga.strict._
import scalapb.GeneratedMessage
import java.security.MessageDigest
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._

final class BankPaymentBindings(
    val original: BankPaymentOriginal,
    investor: ActorRef[CreditBalanceProtocol.Command], investorPersistenceId: String,
    collection: ActorRef[CreditBalanceProtocol.Command], collectionPersistenceId: String,
    order: ActorRef[FundOrderProtocol.Command], orderPersistenceId: String,
    readJournal: String => Future[Vector[GeneratedMessage]],
    coordinator: () => ActorRef[StrictSagaCoordinator.Command]
)(implicit system: ActorSystem[_]) {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)
  private val version = "bank-v1-1"
  val parentInput: Execution.State = Execution.State(Execution.Inputs(original.operationId, original.operationId,
    original.investorAccountId, original.fundOrderId, original.fundCollectionAccountId, original.amount, original.fundCode, original.tenantId))
  val operationId: String = Host.operationIdentity(parentInput)
  private val args = BankPaymentArgs(original.investorAccountId, original.fundOrderId, original.fundCollectionAccountId, original.amount)
  private val argsBytes = BankPaymentProcessCodecs.argsCodec.encode(args)
  private val argsDigest = MessageDigest.getInstance("SHA-256").digest(argsBytes.toByteArray).map(b => f"${b & 0xff}%02x").mkString
  private lazy val definition = ProcessBootstrap.definition(ProcessBootstrap.portsFromTechnical(installed))
  private val participants = Vector("investorCreditBalance", "collectionCreditBalance", "orderFundOrderTCC")
  private val steps = Vector("reserve-investor-funds", "credit-fund-collection", "reserve-cash-fund-order")
  private val resources = Vector(original.investorAccountId.value, original.fundCollectionAccountId.value, original.fundOrderId.value)
  require(investor != null && collection != null && order != null && readJournal != null && coordinator != null)
  require(original.investorAccountId != original.fundCollectionAccountId && original.amount.currency == "CNY" && original.amount.amount > 0)

  private def validateTransaction(id: TransactionIdentity): Unit = {
    require(id != null && id.transactionId == operationId && id.definitionName == definition.name &&
      id.definitionVersion == definition.version && id.definitionDigest == definition.definitionDigest &&
      id.argsCodec == Definition.ArgsCodecPin && id.argsDigest == argsDigest, "payment authority identity mismatch")
  }
  private def validate(id: OperationIdentity, index: Int, phase: Phase): Unit = {
    validateTransaction(id.transaction)
    require(id.participantId == participants(index) && id.resource == resources(index) && id.stepId == steps(index) && id.phase == phase,
      "payment operation resource or phase mismatch")
  }
  private def ledger(index: Int): ActorRef[CreditBalanceProtocol.Command] = if (index == 0) investor else collection
  private def persistence(index: Int): String = Vector(investorPersistenceId, collectionPersistenceId, orderPersistenceId)(index)
  private def ledgerState(index: Int): Future[CreditBalanceEntity.State] = ledger(index).ask[CreditBalanceEntity.State](CreditBalanceProtocol.GetState)
  private def orderState(): Future[FundOrderEntity.State] = order.ask[FundOrderEntity.State](FundOrderProtocol.GetState)
  private def event(raw: GeneratedMessage): Any = raw match {
    case x: CreditBalanceEventPO => DomainConverters.decodeCreditBalanceEventPO(x)
    case x: FundOrderEventPO => DomainConverters.decodeFundOrderEventPO(x)
    case _ => raw
  }
  private def history(index: Int): Future[Vector[Any]] = readJournal(persistence(index)).map(_.map(event))
  private def ledgerEvidence(index: Int, phase: Phase, events: Vector[Any]): Option[Product] = events.collectFirst {
    case e: CreditBalanceEntity.ReserveFundsConfirmed if index == 0 && phase == Phase.Prepare && e.txid.value == operationId && e.resource.value == resources(index) && e.amount == original.amount => e
    case e: CreditBalanceEntity.DeductFundsConfirmed if index == 0 && phase == Phase.Commit && e.txid.value == operationId && e.resource.value == resources(index) && e.amount == original.amount => e
    case e: CreditBalanceEntity.ReleaseReservedFundsConfirmed if index == 0 && phase == Phase.Compensate && e.txid.value == operationId && e.resource.value == resources(index) && e.amount == original.amount => e
    case e: CreditBalanceEntity.RecordIncomingCreditsConfirmed if index == 1 && phase == Phase.Prepare && e.txid.value == operationId && e.resource.value == resources(index) && e.amount == original.amount => e
    case e: CreditBalanceEntity.CommitIncomingCreditsConfirmed if index == 1 && phase == Phase.Commit && e.txid.value == operationId && e.resource.value == resources(index) && e.amount == original.amount => e
    case e: CreditBalanceEntity.CancelIncomingCreditConfirmed if index == 1 && phase == Phase.Compensate && e.txid.value == operationId && e.resource.value == resources(index) && e.amount == original.amount => e
  }
  private def orderEvidence(phase: Phase, events: Vector[Any]): Option[Product] = events.collectFirst {
    case e: FundOrderEntity.ReserveFundSubscriptionConfirmed if phase == Phase.Prepare && e.txid.value == operationId && e.resource == original.fundOrderId && e.amount == original.amount => e
    case e: FundOrderEntity.FundSubscriptionPaymentConfirmed if phase == Phase.Commit && e.txid.value == operationId && e.resource == original.fundOrderId && e.amount == original.amount => e
    case e: FundOrderEntity.CashFundSubscriptionCanceled if phase == Phase.Compensate && e.txid.value == operationId && e.resource == original.fundOrderId && e.amount == original.amount => e
  }
  private def query(index: Int, phase: Phase, id: OperationIdentity): Future[Option[Product]] = {
    validate(id, index, phase)
    history(index).map(events => if (index == 2) orderEvidence(phase, events) else ledgerEvidence(index, phase, events))
  }
  private def ledgerCommand(index: Int, phase: Phase)(replyTo: ActorRef[CreditBalanceProtocol.Reply]): CreditBalanceProtocol.Command = {
    import CreditBalanceProtocol._
    val tx = TxId(operationId); val resource = AccountId(resources(index)); val amount = original.amount
    (index, phase) match {
      case (0, Phase.Prepare) => ReserveFunds(tx, resource, amount, replyTo)
      case (0, Phase.Commit) => DeductFunds(tx, resource, amount, replyTo)
      case (0, Phase.Compensate) => ReleaseReservedFunds(tx, resource, amount, replyTo)
      case (1, Phase.Prepare) => RecordIncomingCredits(tx, resource, amount, replyTo)
      case (1, Phase.Commit) => CommitIncomingCredits(tx, resource, amount, replyTo)
      case (1, Phase.Compensate) => CancelIncomingCredit(tx, resource, amount, replyTo)
      case _ => throw new IllegalArgumentException("unknown bank ledger participant")
    }
  }
  private def orderCommand(phase: Phase)(replyTo: ActorRef[FundOrderProtocol.Reply]): FundOrderProtocol.Command = phase match {
    case Phase.Prepare => FundOrderProtocol.ReserveFundSubscription(TxId(operationId), original.fundOrderId, original.amount, replyTo)
    case Phase.Commit => FundOrderProtocol.ConfirmFundSubscriptionPayment(TxId(operationId), original.fundOrderId, original.amount, replyTo)
    case Phase.Compensate => FundOrderProtocol.CancelCashFundSubscription(TxId(operationId), original.fundOrderId, original.amount, replyTo)
  }
  private def send(index: Int, phase: Phase): Future[Either[String, Unit]] = if (index == 2) {
    order.ask[FundOrderProtocol.Reply](orderCommand(phase)).map {
      case FundOrderProtocol.Accepted(_) => Right(())
      case FundOrderProtocol.Refused(err) => Left(err.code)
    }
  } else ledger(index).ask[CreditBalanceProtocol.Reply](ledgerCommand(index, phase)).map {
    case CreditBalanceProtocol.Accepted(_) => Right(())
    case CreditBalanceProtocol.Refused(err) => Left(err.code)
  }
  private def execute(index: Int, phase: Phase, id: OperationIdentity): Future[Product] = {
    validate(id, index, phase)
    query(index, phase, id).flatMap {
      case Some(receipt) => Future.successful(receipt)
      case None => send(index, phase).flatMap {
        case Right(_) => query(index, phase, id).map(_.getOrElse(throw new IllegalStateException("phase reply lacks original durable event")))
        case Left(code) if phase == Phase.Prepare =>
          send(index, Phase.Compensate).flatMap {
            case Left(_) => Future.failed(new IllegalStateException("rejected prepare has no cancellation fence"))
            case Right(_) => history(index).flatMap { events =>
              val prepared = if (index == 2) orderEvidence(Phase.Prepare, events) else ledgerEvidence(index, Phase.Prepare, events)
              val canceled = if (index == 2) orderEvidence(Phase.Compensate, events) else ledgerEvidence(index, Phase.Compensate, events)
              if (prepared.isEmpty && canceled.nonEmpty) Future.failed(OperationNotExecuted(id, "bank-v1-durable-cancel/" + persistence(index) + "/" + code, true))
              else Future.failed(new IllegalStateException("prepare absence not fenced"))
            }
          }
        case Left(code) => Future.failed(new IllegalStateException("phase refused: " + code))
      }
    }
  }
  private def entry(input: BankPaymentOriginal): Future[Boolean] = {
    if (input != original) Future.successful(false)
    else for {
      a <- ledgerState(0); b <- ledgerState(1); o <- orderState(); events <- history(2)
    } yield a.initialized && b.initialized && a.id == original.investorAccountId && b.id == original.fundCollectionAccountId &&
      o.id == original.fundOrderId && o.operationId == original.operationId && o.investorAccountId == a.id &&
      o.fundCollectionAccountId == b.id && o.fundCode == original.fundCode && o.amount == original.amount && events.exists {
        case e: FundOrderEntity.FundPurchaseSettlementRequested => e.operationId == original.operationId && e.fundOrderId == original.fundOrderId &&
          e.investorAccountId == original.investorAccountId && e.fundCollectionAccountId == original.fundCollectionAccountId && e.fundCode == original.fundCode && e.amount == original.amount
        case _ => false
      }
  }
  private def classify(s: StrictState): String = s.status match {
    case StrictStatus.Succeeded => "succeeded"
    case StrictStatus.Aborted => if (s.evidence.values.exists { case Evidence.Confirmed(id, _) => id.phase == Phase.Prepare; case _ => false }) "compensated" else "rejected-before-effects"
    case StrictStatus.RecoveryRequired => if (s.evidence.values.exists(_.isInstanceOf[Evidence.Uncertain])) "outcome-unknown" else "recovery-required"
    case _ => throw new IllegalStateException("nonterminal payment status")
  }
  private def authority(kind: String, input: BankPaymentOriginal, context: CompletionContext): Future[BankPaymentResult] = {
    require(input == original && context.original == original, "completion original changed")
    validateTransaction(context.identity)
    coordinator().ask[StrictSagaCoordinator.Reply](StrictSagaCoordinator.GetStatus).map {
      case StrictSagaCoordinator.Status(state) =>
        require(state.identity.contains(context.identity) && state.argsBytes == argsBytes && classify(state) == kind, "unproven payment result")
        BankPaymentResult(TxId(context.identity.transactionId))
      case _ => throw new IllegalStateException("no authoritative Saga status")
    }
  }
  private def deliver(kind: String, input: BankPaymentResult, context: CompletionContext): Future[Boolean] = {
    authority(kind, context.original, context).flatMap { actual =>
      require(actual == input, "completion result changed")
      val buildCommand: ActorRef[FundOrderProtocol.Reply] => FundOrderProtocol.Command = kind match {
        case "succeeded" => FundOrderProtocol.RecordFundCashPaymentSucceeded(input.txid, _)
        case "rejected-before-effects" => FundOrderProtocol.RecordFundCashPaymentRejectedBeforeEffects(input.txid, _)
        case "compensated" => FundOrderProtocol.RecordFundCashPaymentCompensated(input.txid, _)
        case "recovery-required" => FundOrderProtocol.RecordFundCashPaymentRecoveryRequired(input.txid, _)
        case "outcome-unknown" => FundOrderProtocol.RecordFundCashPaymentOutcomeUnknown(input.txid, _)
      }
      order.ask[FundOrderProtocol.Reply](buildCommand).map {
        case FundOrderProtocol.Accepted(_) => true
        case FundOrderProtocol.Refused(_) => false
      }
    }
  }
  private def simple[I, O](name: String)(run: I => Future[O]): Technical.RunBinding[I, O] =
    Technical.RunBinding("bankwealth." + name, version, run)
  private def operation[I, O](name: String)(run: (I, OperationIdentity) => Future[O]): Technical.OperationBinding[I, O] =
    Technical.OperationBinding("bankwealth." + name, version, run)
  private def completion[I, O](name: String)(run: (I, CompletionContext) => Future[O]): Technical.CompletionBinding[I, O] =
    Technical.CompletionBinding("bankwealth." + name, version, run)
  private def input(txid: TxId, resource: String, amount: Money, index: Int): Unit =
    require(txid.value == operationId && resource == resources(index) && amount == original.amount, "phase input differs from original")
  private def queryInput(txid: TxId, version: String, digest: String, participant: String, resource: String, step: String, phase: String, id: OperationIdentity): Unit =
    require(txid.value == id.transaction.transactionId && version == id.transaction.definitionVersion.toString && digest == id.transaction.argsDigest &&
      participant == id.participantId && resource == id.resource && step == id.stepId && phase == id.phase.toString.toLowerCase(java.util.Locale.ROOT), "query input identity mismatch")

  lazy val installed: BankPaymentPorts = Technical.install(bindings)
  private lazy val bindings: Technical.Bindings = bankBindings
  private def bankBindings: Technical.Bindings = Technical.Bindings(
    entry = simple[BankPaymentOriginal, Boolean]("BankPaymentEntry")(entry),
    association = simple[BankPaymentOriginal, Boolean]("BankPaymentAssociation")(entry),
    reserveInvestorFundsPrepareExecute = operation[ReserveInvestorFundsPrepareInput, ReserveInvestorFundsPrepareReceipt]("ReserveInvestorFundsPrepareExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 0)
      execute(0, Phase.Prepare, id).map { case e: CreditBalanceEntity.ReserveFundsConfirmed => ReserveInvestorFundsPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    reserveInvestorFundsPrepareQuery = operation[ReserveInvestorFundsPrepareQuery, Option[ReserveInvestorFundsPrepareReceipt]]("ReserveInvestorFundsPrepareQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(0, Phase.Prepare, id).map(_.map { case e: CreditBalanceEntity.ReserveFundsConfirmed => ReserveInvestorFundsPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    reserveInvestorFundsCommitExecute = operation[ReserveInvestorFundsCommitInput, ReserveInvestorFundsCommitReceipt]("ReserveInvestorFundsCommitExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 0)
      execute(0, Phase.Commit, id).map { case e: CreditBalanceEntity.DeductFundsConfirmed => ReserveInvestorFundsCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    reserveInvestorFundsCommitQuery = operation[ReserveInvestorFundsCommitQuery, Option[ReserveInvestorFundsCommitReceipt]]("ReserveInvestorFundsCommitQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(0, Phase.Commit, id).map(_.map { case e: CreditBalanceEntity.DeductFundsConfirmed => ReserveInvestorFundsCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    reserveInvestorFundsCompensateExecute = operation[ReserveInvestorFundsCompensateInput, ReserveInvestorFundsCompensateReceipt]("ReserveInvestorFundsCompensateExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 0)
      execute(0, Phase.Compensate, id).map { case e: CreditBalanceEntity.ReleaseReservedFundsConfirmed => ReserveInvestorFundsCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    reserveInvestorFundsCompensateQuery = operation[ReserveInvestorFundsCompensateQuery, Option[ReserveInvestorFundsCompensateReceipt]]("ReserveInvestorFundsCompensateQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(0, Phase.Compensate, id).map(_.map { case e: CreditBalanceEntity.ReleaseReservedFundsConfirmed => ReserveInvestorFundsCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    creditFundCollectionPrepareExecute = operation[CreditFundCollectionPrepareInput, CreditFundCollectionPrepareReceipt]("CreditFundCollectionPrepareExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 1)
      execute(1, Phase.Prepare, id).map { case e: CreditBalanceEntity.RecordIncomingCreditsConfirmed => CreditFundCollectionPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    creditFundCollectionPrepareQuery = operation[CreditFundCollectionPrepareQuery, Option[CreditFundCollectionPrepareReceipt]]("CreditFundCollectionPrepareQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(1, Phase.Prepare, id).map(_.map { case e: CreditBalanceEntity.RecordIncomingCreditsConfirmed => CreditFundCollectionPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    creditFundCollectionCommitExecute = operation[CreditFundCollectionCommitInput, CreditFundCollectionCommitReceipt]("CreditFundCollectionCommitExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 1)
      execute(1, Phase.Commit, id).map { case e: CreditBalanceEntity.CommitIncomingCreditsConfirmed => CreditFundCollectionCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    creditFundCollectionCommitQuery = operation[CreditFundCollectionCommitQuery, Option[CreditFundCollectionCommitReceipt]]("CreditFundCollectionCommitQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(1, Phase.Commit, id).map(_.map { case e: CreditBalanceEntity.CommitIncomingCreditsConfirmed => CreditFundCollectionCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    creditFundCollectionCompensateExecute = operation[CreditFundCollectionCompensateInput, CreditFundCollectionCompensateReceipt]("CreditFundCollectionCompensateExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 1)
      execute(1, Phase.Compensate, id).map { case e: CreditBalanceEntity.CancelIncomingCreditConfirmed => CreditFundCollectionCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    creditFundCollectionCompensateQuery = operation[CreditFundCollectionCompensateQuery, Option[CreditFundCollectionCompensateReceipt]]("CreditFundCollectionCompensateQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(1, Phase.Compensate, id).map(_.map { case e: CreditBalanceEntity.CancelIncomingCreditConfirmed => CreditFundCollectionCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    reserveCashFundOrderPrepareExecute = operation[ReserveCashFundOrderPrepareInput, ReserveCashFundOrderPrepareReceipt]("ReserveCashFundOrderPrepareExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 2)
      execute(2, Phase.Prepare, id).map { case e: FundOrderEntity.ReserveFundSubscriptionConfirmed => ReserveCashFundOrderPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, FundOrderId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    reserveCashFundOrderPrepareQuery = operation[ReserveCashFundOrderPrepareQuery, Option[ReserveCashFundOrderPrepareReceipt]]("ReserveCashFundOrderPrepareQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(2, Phase.Prepare, id).map(_.map { case e: FundOrderEntity.ReserveFundSubscriptionConfirmed => ReserveCashFundOrderPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, FundOrderId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    reserveCashFundOrderCommitExecute = operation[ReserveCashFundOrderCommitInput, ReserveCashFundOrderCommitReceipt]("ReserveCashFundOrderCommitExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 2)
      execute(2, Phase.Commit, id).map { case e: FundOrderEntity.FundSubscriptionPaymentConfirmed => ReserveCashFundOrderCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, FundOrderId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    reserveCashFundOrderCommitQuery = operation[ReserveCashFundOrderCommitQuery, Option[ReserveCashFundOrderCommitReceipt]]("ReserveCashFundOrderCommitQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(2, Phase.Commit, id).map(_.map { case e: FundOrderEntity.FundSubscriptionPaymentConfirmed => ReserveCashFundOrderCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, FundOrderId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    reserveCashFundOrderCompensateExecute = operation[ReserveCashFundOrderCompensateInput, ReserveCashFundOrderCompensateReceipt]("ReserveCashFundOrderCompensateExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 2)
      execute(2, Phase.Compensate, id).map { case e: FundOrderEntity.CashFundSubscriptionCanceled => ReserveCashFundOrderCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, FundOrderId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    reserveCashFundOrderCompensateQuery = operation[ReserveCashFundOrderCompensateQuery, Option[ReserveCashFundOrderCompensateReceipt]]("ReserveCashFundOrderCompensateQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(2, Phase.Compensate, id).map(_.map { case e: FundOrderEntity.CashFundSubscriptionCanceled => ReserveCashFundOrderCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, FundOrderId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    succeededAuthority = completion[BankPaymentOriginal, BankPaymentResult]("BankPaymentSucceededAuthority")((input, context) => authority("succeeded", input, context)),
    succeededDelivery = completion[BankPaymentResult, Boolean]("BankPaymentSucceededDelivery")((input, context) => deliver("succeeded", input, context)),
    rejectedBeforeEffectsAuthority = completion[BankPaymentOriginal, BankPaymentResult]("BankPaymentRejectedBeforeEffectsAuthority")((input, context) => authority("rejected-before-effects", input, context)),
    rejectedBeforeEffectsDelivery = completion[BankPaymentResult, Boolean]("BankPaymentRejectedBeforeEffectsDelivery")((input, context) => deliver("rejected-before-effects", input, context)),
    compensatedAuthority = completion[BankPaymentOriginal, BankPaymentResult]("BankPaymentCompensatedAuthority")((input, context) => authority("compensated", input, context)),
    compensatedDelivery = completion[BankPaymentResult, Boolean]("BankPaymentCompensatedDelivery")((input, context) => deliver("compensated", input, context)),
    recoveryRequiredAuthority = completion[BankPaymentOriginal, BankPaymentResult]("BankPaymentRecoveryRequiredAuthority")((input, context) => authority("recovery-required", input, context)),
    recoveryRequiredDelivery = completion[BankPaymentResult, Boolean]("BankPaymentRecoveryRequiredDelivery")((input, context) => deliver("recovery-required", input, context)),
    outcomeUnknownAuthority = completion[BankPaymentOriginal, BankPaymentResult]("BankPaymentOutcomeUnknownAuthority")((input, context) => authority("outcome-unknown", input, context)),
    outcomeUnknownDelivery = completion[BankPaymentResult, Boolean]("BankPaymentOutcomeUnknownDelivery")((input, context) => deliver("outcome-unknown", input, context))
  )
}
