package example.bankwealth.application.services

import example.bankwealth.infrastructure.bootstrap.BankRuntimeDirectory
import example.bankwealth.infrastructure.persistence.BankJournal
import example.bankwealth.infrastructure.security.BankDemoConfiguration
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
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
import example.bankwealth.infrastructure.persistence.BankCashPaymentStateCodec
import example.bankwealth.infrastructure.persistence.converters.DomainConverters
import example.bankwealth.infrastructure.security.BankDemoConfiguration
import example.bankwealth.infrastructure.bootstrap.BankServiceContract._
import net.imadz.monarch.persistence.PersistentMonarch
import example.bankwealth.application.process.cash_payment.{BankCashPaymentExecution => Cash}
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._
import scala.util.control.NonFatal

final class BankCashRequests(directory: BankRuntimeDirectory, config: BankDemoConfiguration,
    admission: BankTrustedAdmission, journal: BankJournal)(implicit system: ActorSystem[_]) extends BankCashRequestService {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)

  def submit(principal: Principal, request: BankCashSubmit): Future[Outcome[BankCashAcknowledgement]] = admission.cash(principal, request) match {
    case Left(error) => Future.successful(Left(error))
    case Right(original) =>
      val source = admission.toCashSource(original)
      directory.order(original.payment.fundOrderId).flatMap { handle =>
        handle.ref.ask[FundOrderProtocol.Reply](FundOrderProtocol.RecordCashRequestSource(source, Some(source), _)).flatMap {
          case _: FundOrderProtocol.Refused => Future.successful(Left(RequestConflict))
          case _: FundOrderProtocol.Accepted =>
            handle.ref.ask[FundOrderEntity.State](FundOrderProtocol.GetState).flatMap { state =>
              require(state.cashRequestSource.contains(source), "accepted original source was not retained")
              admission.validateCashSource(state.cashRequestSource.get)
              start(original.payment).map(_.map(_ => BankCashAcknowledgement(original, "accepted")))
            }
        }
      }.recover { case NonFatal(_) => Left(Unavailable) }
  }

  def getOriginal(principal: Principal, clientRequestId: String): Future[Outcome[BankCashOriginal]] = {
    config.customer(principal) match {
      case None => Future.successful(Left(NotAuthorized))
      case Some(customer) =>
        val id = try Right(BankRequestIdentity.order(customer.id, clientRequestId)) catch { case NonFatal(_) => Left(InvalidRequest) }
        id match {
          case Left(error) => Future.successful(Left(error))
          case Right(orderId) => directory.order(orderId).flatMap(_.ref.ask[FundOrderEntity.State](FundOrderProtocol.GetState)).map { state =>
            state.cashRequestSource match {
              case None => Left(MissingResource)
              case Some(source) if source.principalId != customer.id || source.clientRequestId != clientRequestId => Left(NotAuthorized)
              case Some(source) =>
                val original = admission.toCashOriginal(source)
                admission.validateCash(original)
                Right(original)
            }
          }.recover { case NonFatal(_) => Left(Unavailable) }
        }
    }
  }

  def resumePersisted(original: BankCashOriginal): Future[Outcome[BankPaymentOriginal]] = {
    admission.validateCash(original)
    val expected = admission.toCashSource(original)
    directory.order(original.payment.fundOrderId).flatMap(_.ref.ask[FundOrderEntity.State](FundOrderProtocol.GetState)).flatMap { state =>
      require(state.cashRequestSource.contains(expected), "recovery requires retained full original source")
      start(original.payment)
    }.recover { case NonFatal(_) => Left(Unavailable) }
  }

  def submitOccurrence(occurrence: SipOccurrence): Future[Outcome[BankPaymentOriginal]] = {
    directory.plan(occurrence.planId).flatMap(_.ref.ask[SipPlanEntity.State](SipPlanProtocol.GetState)).flatMap { state =>
      require(state.occurrences.get(occurrence.dueSlot).contains(occurrence), "machine cash requires original persisted occurrence")
      start(BankPaymentOriginal(occurrence.operationId, occurrence.fundOrderId, TenantId("bankwealth"), occurrence.config.investorAccountId,
        occurrence.config.fundCollectionAccountId, occurrence.config.fundCode, occurrence.config.amount))
    }.recover { case NonFatal(_) => Left(Unavailable) }
  }

  private def start(original: BankPaymentOriginal): Future[Outcome[BankPaymentOriginal]] = {
    directory.order(original.fundOrderId).flatMap { handle =>
      handle.ref.ask[FundOrderProtocol.Reply](FundOrderProtocol.RequestFundPurchaseSettlement(
        original.operationId, original.fundOrderId, original.tenantId, original.investorAccountId, original.fundCollectionAccountId, original.fundCode, original.amount, _)).flatMap {
        case _: FundOrderProtocol.Refused => Future.successful(Left(RequestConflict))
        case _: FundOrderProtocol.Accepted => directory.ensureCash(original).flatMap { runtime =>
          val state = Cash.State(Cash.Inputs(original.operationId, original.operationId, original.investorAccountId,
            original.fundOrderId, original.fundCollectionAccountId, original.amount, original.fundCode, original.tenantId))
          runtime.parent.ref.ask[PersistentMonarch.RunReply](r => PersistentMonarch.StartRun(original.operationId.value, state, r)).flatMap { _ =>
            journal.readAll(runtime.parent.persistenceId).map { events =>
              require(events.exists {
                case started: PersistentMonarch.RunStarted => started.runId == original.operationId.value && java.util.Arrays.equals(started.initialSnapshot, BankCashPaymentStateCodec.codec.encode(state))
                case _ => false
              }, "cash start acknowledgement lacks matching durable original start")
              Right(original)
            }
          }
        }
      }
    }
  }
}
