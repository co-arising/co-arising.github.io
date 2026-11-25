package example.bankwealth.application.services

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
import scala.concurrent.Future

trait BankCashRequestService {
  def submit(principal: Principal, request: BankCashSubmit): Future[Outcome[BankCashAcknowledgement]]
  def getOriginal(principal: Principal, clientRequestId: String): Future[Outcome[BankCashOriginal]]
  def submitOccurrence(occurrence: SipOccurrence): Future[Outcome[BankPaymentOriginal]]
}

trait BankReadQueries {
  def accountMe(principal: Principal, key: BankAccountKey): Future[Outcome[BankAccountResponse]]
  def cashOriginal(principal: Principal, key: BankCashRequestKey): Future[Outcome[BankCashRequestResponse]]
  def order(principal: Principal, key: BankOrderKey): Future[Outcome[BankOrderResponse]]
  def plans(principal: Principal, key: BankPlanPageKey): Future[Outcome[BankSipPlanPage]]
  def plan(principal: Principal, key: BankPlanKey): Future[Outcome[BankSipPlanResponse]]
  def occurrences(principal: Principal, key: BankOccurrencePageKey): Future[Outcome[BankSipOccurrencePage]]
  def pending(principal: Principal, key: BankPendingPageKey): Future[Outcome[BankPendingResponse]]
}

trait BankTaRefundService extends AutoCloseable {
  def resumeExisting(orderId: FundOrderId): Future[Outcome[Unit]]
}

trait BankSipApplicationService extends AutoCloseable {
  def create(principal: Principal, request: BankSipCreate): Future[Outcome[BankSipAcknowledgement]]
  def revise(principal: Principal, request: BankSipRevisionInput): Future[Outcome[BankSipAcknowledgement]]
  def pause(principal: Principal, key: BankPlanKey): Future[Outcome[BankSipAcknowledgement]]
  def resume(principal: Principal, key: BankPlanKey): Future[Outcome[BankSipAcknowledgement]]
  def tick(principal: Principal, request: BankTick): Future[Outcome[BankTickAcknowledgement]]
  def recoverExisting(planId: PlanId): Future[Outcome[Unit]]
  def recordTerminal(occurrence: SipOccurrence): Future[Outcome[Unit]]
}

trait BankRecoveryService {
  def reconcileExisting(principal: Principal, key: BankOperationKey): Future[Outcome[BankRecoveryAcknowledgement]]
}
