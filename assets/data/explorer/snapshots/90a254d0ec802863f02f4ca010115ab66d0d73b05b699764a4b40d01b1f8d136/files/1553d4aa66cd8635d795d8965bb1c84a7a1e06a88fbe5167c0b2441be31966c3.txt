package example.bankwealth.infrastructure.clock

import example.bankwealth.application.services.BankSipApplicationService
import example.bankwealth.infrastructure.connectors.MockTAClient
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
import example.bankwealth.infrastructure.bootstrap.BankServiceContract.{Outcome, Principal}
import example.bankwealth.infrastructure.connectors.MockTAClient
import scala.concurrent.{ExecutionContext, Future}

final class BankBusinessClock(sip: BankSipApplicationService, client: MockTAClient) extends BankSipApplicationService {
  private implicit val ec: ExecutionContext = ExecutionContext.parasitic
  private var tail = Future.successful(())
  def create(p: Principal, request: BankSipCreate): Future[Outcome[BankSipAcknowledgement]] = sip.create(p, request)
  def revise(p: Principal, request: BankSipRevisionInput): Future[Outcome[BankSipAcknowledgement]] = sip.revise(p, request)
  def pause(p: Principal, key: BankPlanKey): Future[Outcome[BankSipAcknowledgement]] = sip.pause(p, key)
  def resume(p: Principal, key: BankPlanKey): Future[Outcome[BankSipAcknowledgement]] = sip.resume(p, key)
  def recoverExisting(id: PlanId): Future[Outcome[Unit]] = sip.recoverExisting(id)
  def recordTerminal(occurrence: SipOccurrence): Future[Outcome[Unit]] = sip.recordTerminal(occurrence)
  def tick(p: Principal, request: BankTick): Future[Outcome[BankTickAcknowledgement]] = synchronized {
    val result = tail.recover { case scala.util.control.NonFatal(_) => () }.flatMap { _ =>
      sip.tick(p, request).flatMap {
        case Left(error) => Future.successful(Left(error))
        case Right(ack) => client.query("bank-business-clock-observation").flatMap { observed =>
          val current = observed.path("businessTick")
          require(current.isIntegralNumber && current.canConvertToLong, "durable TA clock observation required")
          require(request.slot >= current.asLong(), "TA clock cannot move backwards")
          client.advance(request.slot - current.asLong()).map(_ => Right(ack))
        }
      }
    }
    tail = result.map(_ => ())
    result
  }
  def close(): Unit = ()
}
