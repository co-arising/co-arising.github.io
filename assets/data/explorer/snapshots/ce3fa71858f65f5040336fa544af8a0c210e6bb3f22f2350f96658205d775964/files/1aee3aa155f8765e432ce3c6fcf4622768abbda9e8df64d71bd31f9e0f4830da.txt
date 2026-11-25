package example.bankwealth.infrastructure.process

import example.bankwealth.domain.services.impl.StableOrderIdentity
import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
import example.bankwealth.application.process.independent_refund.{BankIndependentRefundExecution => Execution, BankRefundSagaDefinition => Definition, BankRefundPorts}
import example.bankwealth.infrastructure.process.{BankRefundHost => Host}
import example.bankwealth.application.process.independent_refund.BankRefundPorts.{CompletionContext, OperationNotExecuted}
import example.bankwealth.infrastructure.bootstrap.{BankRefundPortBindings => Technical, BankRefundProcessBootstrap => ProcessBootstrap}
import example.bankwealth.infrastructure.persistence.BankRefundProcessCodecs
import example.bankwealth.application.aggregates.{CreditBalanceProtocol, FundOrderProtocol}
import example.bankwealth.domain.entities.{CreditBalanceEntity, FundOrderEntity}
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
import example.bankwealth.application.process.protocol.CreditOriginalInvestorStep._
import example.bankwealth.application.process.protocol.DebitFundCollectionStep._
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

final class BankRefundBindings(
    val original: BankRefundOriginal,
    investor: ActorRef[CreditBalanceProtocol.Command], investorPersistenceId: String,
    collection: ActorRef[CreditBalanceProtocol.Command], collectionPersistenceId: String,
    order: ActorRef[FundOrderProtocol.Command], orderPersistenceId: String,
    readJournal: String => Future[Vector[GeneratedMessage]],
    coordinator: () => ActorRef[StrictSagaCoordinator.Command]
)(implicit system: ActorSystem[_]) {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)
  private val version = "bank-v1-1"
  val parentInput: Execution.State = Execution.State(Execution.Inputs(original.fundOrderId, original.paymentTxId,
    original.investorAccountId, original.fundCollectionAccountId, original.amount, original.refundOperationId))
  val operationId: String = Host.operationIdentity(parentInput)
  private val args = BankRefundArgs(original.fundCollectionAccountId, original.investorAccountId, original.amount)
  private val argsBytes = BankRefundProcessCodecs.argsCodec.encode(args)
  private val argsDigest = MessageDigest.getInstance("SHA-256").digest(argsBytes.toByteArray).map(b => f"${b & 0xff}%02x").mkString
  private lazy val definition = ProcessBootstrap.definition(ProcessBootstrap.portsFromTechnical(installed))
  private val participants = Vector("collectionCreditBalance", "investorCreditBalance")
  private val steps = Vector("debit-fund-collection", "credit-original-investor")
  private val resources = Vector(original.fundCollectionAccountId.value, original.investorAccountId.value)
  require(investor != null && collection != null && order != null && readJournal != null && coordinator != null)
  require(original.investorAccountId != original.fundCollectionAccountId && original.amount.currency == "CNY" && original.amount.amount > 0)

  private def validateTransaction(id: TransactionIdentity): Unit = {
    require(id != null && id.transactionId == operationId && id.definitionName == definition.name &&
      id.definitionVersion == definition.version && id.definitionDigest == definition.definitionDigest &&
      id.argsCodec == Definition.ArgsCodecPin && id.argsDigest == argsDigest, "refund authority identity mismatch")
  }
  private def validate(id: OperationIdentity, index: Int, phase: Phase): Unit = {
    validateTransaction(id.transaction)
    require(id.participantId == participants(index) && id.resource == resources(index) && id.stepId == steps(index) && id.phase == phase,
      "refund operation resource or phase mismatch")
  }
  private def ledger(index: Int): ActorRef[CreditBalanceProtocol.Command] = if (index == 0) collection else investor
  private def persistence(index: Int): String = Vector(collectionPersistenceId, investorPersistenceId)(index)
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
  private def query(index: Int, phase: Phase, id: OperationIdentity): Future[Option[Product]] = {
    validate(id, index, phase)
    history(index).map { events =>
      val receipt = ledgerEvidence(index, phase, events)
      if (phase == Phase.Prepare && receipt.isEmpty && ledgerEvidence(index, Phase.Compensate, events).nonEmpty)
        throw OperationNotExecuted(id, "bank-v1-durable-cancel/" + persistence(index) + "/query", true)
      receipt
    }
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
      case _ => throw new IllegalArgumentException("unknown bank refund participant")
    }
  }
  private def send(index: Int, phase: Phase): Future[Either[String, Unit]] = ledger(index).ask[CreditBalanceProtocol.Reply](ledgerCommand(index, phase)).map {
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
              val prepared = ledgerEvidence(index, Phase.Prepare, events)
              val canceled = ledgerEvidence(index, Phase.Compensate, events)
              if (prepared.isEmpty && canceled.nonEmpty) Future.failed(OperationNotExecuted(id, "bank-v1-durable-cancel/" + persistence(index) + "/" + code, true))
              else Future.failed(new IllegalStateException("prepare absence not fenced"))
            }
          }
        case Left(code) => Future.failed(new IllegalStateException("phase refused: " + code))
      }
    }
  }
  private def entry(input: BankRefundOriginal): Future[Boolean] = {
    if (input != original || original.refundOperationId.value.isEmpty || operationId == original.paymentTxId.value) Future.successful(false)
    else for {
      collectionState <- ledgerState(0); investorState <- ledgerState(1); o <- orderState()
      events <- readJournal(orderPersistenceId).map(_.map(event))
    } yield collectionState.initialized && investorState.initialized && collectionState.id == original.fundCollectionAccountId && investorState.id == original.investorAccountId &&
      o.id == original.fundOrderId && o.selectedPaymentTxId == original.paymentTxId && o.cashPaymentFinalResults.get(original.paymentTxId).contains("succeeded") &&
      o.taStatus == "rejected" && o.refundOperationId == original.refundOperationId && o.investorAccountId == original.investorAccountId &&
      o.fundCollectionAccountId == original.fundCollectionAccountId && o.amount == original.amount &&
      StableOrderIdentity.stableRefundOperationId(o,
        FundOrderRuleParams.RequestFundPurchaseRefundParams(original.fundOrderId, original.paymentTxId)).contains(original.refundOperationId) &&
      events.exists { case e: FundOrderEntity.FundCashPaymentSucceeded => e.txid == original.paymentTxId; case _ => false } &&
      events.exists { case e: FundOrderEntity.FundTASubmissionRegistered => e.fundOrderId == o.id && e.paymentTxId == original.paymentTxId && e.taRequestId == o.taRequestId; case _ => false } &&
      events.collectFirst {
        case e: FundOrderEntity.FundTARejected if e.fundOrderId == o.id && e.paymentTxId == original.paymentTxId && e.taRequestId == o.taRequestId =>
          o.taReceipts.get(e.receiptId).contains(e.receiptBody) && o.taReceiptOutcomes.get(e.receiptId).contains("rejected") &&
            e.fundCode == o.fundCode && e.currency == o.amount.currency && e.taReference == o.taReference && e.reason == o.taRejectionReason
        case e: FundOrderEntity.FundTASharesConfirmed if e.fundOrderId == o.id && e.paymentTxId == original.paymentTxId && e.taRequestId == o.taRequestId => false
      }.contains(true) && events.exists {
        case e: FundOrderEntity.FundPurchaseRefundRequested => e.fundOrderId == original.fundOrderId && e.paymentTxId == original.paymentTxId &&
          e.investorAccountId == original.investorAccountId && e.fundCollectionAccountId == original.fundCollectionAccountId && e.amount == original.amount && e.refundOperationId == original.refundOperationId
        case _ => false
      }
  }
  private def classify(s: StrictState): String = s.status match {
    case StrictStatus.Succeeded => "succeeded"
    case StrictStatus.Aborted => if (s.evidence.values.exists { case Evidence.Confirmed(id, _) => id.phase == Phase.Prepare; case _ => false }) "compensated" else "rejected-before-effects"
    case StrictStatus.RecoveryRequired => if (s.evidence.values.exists(_.isInstanceOf[Evidence.Uncertain])) "outcome-unknown" else "recovery-required"
    case _ => throw new IllegalStateException("nonterminal refund status")
  }
  private def authority(kind: String, input: BankRefundOriginal, context: CompletionContext): Future[BankRefundResult] = {
    require(input == original && context.original == original, "completion original changed")
    validateTransaction(context.identity)
    coordinator().ask[StrictSagaCoordinator.Reply](StrictSagaCoordinator.GetStatus).map {
      case StrictSagaCoordinator.Status(state) =>
        require(state.identity.contains(context.identity) && state.argsBytes == argsBytes && classify(state) == kind, "unproven refund result")
        BankRefundResult(TxId(context.identity.transactionId))
      case _ => throw new IllegalStateException("no authoritative Saga status")
    }
  }
  private def deliver(kind: String, input: BankRefundResult, context: CompletionContext): Future[Boolean] = {
    authority(kind, context.original, context).flatMap { actual =>
      require(actual == input, "completion result changed")
      val receiptId = "bank-refund-result-v1/" + operationId + "/" + kind
      val receiptBody = Vector(kind, operationId, original.paymentTxId.value, original.refundOperationId.value,
        original.fundOrderId.value, original.fundCollectionAccountId.value, original.investorAccountId.value,
        DomainConverters.MoneyToWire(original.amount).minorUnits, argsDigest).map(s => s.length.toString + ":" + s).mkString
      val buildCommand: ActorRef[FundOrderProtocol.Reply] => FundOrderProtocol.Command = kind match {
        case "succeeded" => FundOrderProtocol.RecordFundRefundSucceeded(input.txid, original.refundOperationId, receiptId, receiptBody, _)
        case "rejected-before-effects" => FundOrderProtocol.RecordFundRefundRejectedBeforeEffects(input.txid, original.refundOperationId, receiptId, receiptBody, _)
        case "compensated" => FundOrderProtocol.RecordFundRefundCompensated(input.txid, original.refundOperationId, receiptId, receiptBody, _)
        case "recovery-required" => FundOrderProtocol.RecordFundRefundRecoveryRequired(input.txid, original.refundOperationId, receiptId, receiptBody, _)
        case "outcome-unknown" => FundOrderProtocol.RecordFundRefundOutcomeUnknown(input.txid, original.refundOperationId, receiptId, receiptBody, _)
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

  lazy val installed: BankRefundPorts = Technical.install(bindings)
  private lazy val bindings: Technical.Bindings = bankBindings
  private def bankBindings: Technical.Bindings = Technical.Bindings(
    entry = simple[BankRefundOriginal, Boolean]("BankRefundEntry")(entry),
    association = simple[BankRefundOriginal, Boolean]("BankRefundAssociation")(entry),
    debitFundCollectionPrepareExecute = operation[DebitFundCollectionPrepareInput, DebitFundCollectionPrepareReceipt]("DebitFundCollectionPrepareExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 0)
      execute(0, Phase.Prepare, id).map { case e: CreditBalanceEntity.ReserveFundsConfirmed => DebitFundCollectionPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    debitFundCollectionPrepareQuery = operation[DebitFundCollectionPrepareQuery, Option[DebitFundCollectionPrepareReceipt]]("DebitFundCollectionPrepareQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(0, Phase.Prepare, id).map(_.map { case e: CreditBalanceEntity.ReserveFundsConfirmed => DebitFundCollectionPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    debitFundCollectionCommitExecute = operation[DebitFundCollectionCommitInput, DebitFundCollectionCommitReceipt]("DebitFundCollectionCommitExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 0)
      execute(0, Phase.Commit, id).map { case e: CreditBalanceEntity.DeductFundsConfirmed => DebitFundCollectionCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    debitFundCollectionCommitQuery = operation[DebitFundCollectionCommitQuery, Option[DebitFundCollectionCommitReceipt]]("DebitFundCollectionCommitQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(0, Phase.Commit, id).map(_.map { case e: CreditBalanceEntity.DeductFundsConfirmed => DebitFundCollectionCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    debitFundCollectionCompensateExecute = operation[DebitFundCollectionCompensateInput, DebitFundCollectionCompensateReceipt]("DebitFundCollectionCompensateExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 0)
      execute(0, Phase.Compensate, id).map { case e: CreditBalanceEntity.ReleaseReservedFundsConfirmed => DebitFundCollectionCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    debitFundCollectionCompensateQuery = operation[DebitFundCollectionCompensateQuery, Option[DebitFundCollectionCompensateReceipt]]("DebitFundCollectionCompensateQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(0, Phase.Compensate, id).map(_.map { case e: CreditBalanceEntity.ReleaseReservedFundsConfirmed => DebitFundCollectionCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    creditOriginalInvestorPrepareExecute = operation[CreditOriginalInvestorPrepareInput, CreditOriginalInvestorPrepareReceipt]("CreditOriginalInvestorPrepareExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 1)
      execute(1, Phase.Prepare, id).map { case e: CreditBalanceEntity.RecordIncomingCreditsConfirmed => CreditOriginalInvestorPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    creditOriginalInvestorPrepareQuery = operation[CreditOriginalInvestorPrepareQuery, Option[CreditOriginalInvestorPrepareReceipt]]("CreditOriginalInvestorPrepareQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(1, Phase.Prepare, id).map(_.map { case e: CreditBalanceEntity.RecordIncomingCreditsConfirmed => CreditOriginalInvestorPrepareReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    creditOriginalInvestorCommitExecute = operation[CreditOriginalInvestorCommitInput, CreditOriginalInvestorCommitReceipt]("CreditOriginalInvestorCommitExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 1)
      execute(1, Phase.Commit, id).map { case e: CreditBalanceEntity.CommitIncomingCreditsConfirmed => CreditOriginalInvestorCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    creditOriginalInvestorCommitQuery = operation[CreditOriginalInvestorCommitQuery, Option[CreditOriginalInvestorCommitReceipt]]("CreditOriginalInvestorCommitQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(1, Phase.Commit, id).map(_.map { case e: CreditBalanceEntity.CommitIncomingCreditsConfirmed => CreditOriginalInvestorCommitReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount, e.currency, e.available); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    creditOriginalInvestorCompensateExecute = operation[CreditOriginalInvestorCompensateInput, CreditOriginalInvestorCompensateReceipt]("CreditOriginalInvestorCompensateExecute") { (p, id) =>
      input(p.txid, p.resource.value, p.amount, 1)
      execute(1, Phase.Compensate, id).map { case e: CreditBalanceEntity.CancelIncomingCreditConfirmed => CreditOriginalInvestorCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") }
    },
    creditOriginalInvestorCompensateQuery = operation[CreditOriginalInvestorCompensateQuery, Option[CreditOriginalInvestorCompensateReceipt]]("CreditOriginalInvestorCompensateQueryPort") { (p, id) =>
      queryInput(p.transaction, p.definitionVersion, p.argsDigest, p.participant, p.resource.value, p.step, p.phase, id)
      query(1, Phase.Compensate, id).map(_.map { case e: CreditBalanceEntity.CancelIncomingCreditConfirmed => CreditOriginalInvestorCompensateReceipt(TxId(id.transaction.transactionId), id.transaction.definitionVersion.toString, id.transaction.argsDigest, id.participantId, AccountId(id.resource), id.stepId, id.phase.toString.toLowerCase(java.util.Locale.ROOT), e.txid, e.resource, e.amount); case _ => throw new IllegalStateException("wrong persisted phase event") })
    },
    succeededAuthority = completion[BankRefundOriginal, BankRefundResult]("BankRefundSucceededAuthority")((input, context) => authority("succeeded", input, context)),
    succeededDelivery = completion[BankRefundResult, Boolean]("BankRefundSucceededDelivery")((input, context) => deliver("succeeded", input, context)),
    rejectedBeforeEffectsAuthority = completion[BankRefundOriginal, BankRefundResult]("BankRefundRejectedBeforeEffectsAuthority")((input, context) => authority("rejected-before-effects", input, context)),
    rejectedBeforeEffectsDelivery = completion[BankRefundResult, Boolean]("BankRefundRejectedBeforeEffectsDelivery")((input, context) => deliver("rejected-before-effects", input, context)),
    compensatedAuthority = completion[BankRefundOriginal, BankRefundResult]("BankRefundCompensatedAuthority")((input, context) => authority("compensated", input, context)),
    compensatedDelivery = completion[BankRefundResult, Boolean]("BankRefundCompensatedDelivery")((input, context) => deliver("compensated", input, context)),
    recoveryRequiredAuthority = completion[BankRefundOriginal, BankRefundResult]("BankRefundRecoveryRequiredAuthority")((input, context) => authority("recovery-required", input, context)),
    recoveryRequiredDelivery = completion[BankRefundResult, Boolean]("BankRefundRecoveryRequiredDelivery")((input, context) => deliver("recovery-required", input, context)),
    outcomeUnknownAuthority = completion[BankRefundOriginal, BankRefundResult]("BankRefundOutcomeUnknownAuthority")((input, context) => authority("outcome-unknown", input, context)),
    outcomeUnknownDelivery = completion[BankRefundResult, Boolean]("BankRefundOutcomeUnknownDelivery")((input, context) => deliver("outcome-unknown", input, context))
  )
}
