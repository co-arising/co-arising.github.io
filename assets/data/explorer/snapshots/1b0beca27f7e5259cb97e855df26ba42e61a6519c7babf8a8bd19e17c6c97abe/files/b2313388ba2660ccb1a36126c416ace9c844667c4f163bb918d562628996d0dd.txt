package example.bankwealth.infrastructure.connectors

import example.bankwealth.infrastructure.bootstrap.BankRuntime
import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
import example.bankwealth.infrastructure.connectors.{BankTaEffectHost => Host}
import example.bankwealth.application.process.ta_submission.{BankTaSubmissionExecution => Execution}
import example.bankwealth.application.aggregates.FundOrderProtocol
import example.bankwealth.domain.entities.FundOrderEntity
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
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._

object BankTaEffectBindings {
  private[bankwealth] val RecoveryAuthorization = "bank-demo-ta-original-retry-v1"

  private[bankwealth] def authoritativeAbsence(response: com.fasterxml.jackson.databind.JsonNode, requestId: String): Boolean = {
    if (response == null || !response.isObject) false
    else {
      val observation = response.path("observation")
      val tick = response.path("businessTick")
      response.path("requestId").asText() == requestId && !response.has("request") &&
        response.path("status").asText() == "unknown" && response.path("pending").isBoolean && response.path("pending").asBoolean() &&
        tick.isIntegralNumber && tick.canConvertToLong && tick.asLong() >= 0 && tick.asLong() <= 9007199254740991L &&
        observation.isObject && observation.path("outcome").asText() == "unknown" &&
        observation.path("reason").asText() == "REQUEST_NOT_FOUND" && observation.path("businessTick") == tick &&
        Vector("canonicalReceipts", "receipts", "conflicts").forall(key => response.path(key).isArray && response.path(key).size() == 0)
    }
  }
  /** Constructor input for BankRuntime.taBindings. Both host paths resolve the
    * scenario from the same trusted deployment function, never an HTTP field.
    */
  def forOrders(client: MockTAClient, scenarioForOrder: FundOrderId => String)
      (implicit system: ActorSystem[_]): ActorRef[FundOrderProtocol.Command] => Host.Installed = {
    require(client != null && !client.usesLegacyConfiguration && scenarioForOrder != null,
      "explicit MockTA configuration and trusted per-order scenarios required")
    order => {
      val bridge = new BankTaBridge(order, client)
      def bindings(operation: BankTaEffectOperation): Host.Installed = {
        val scenario = scenarioForOrder(operation.request.fundOrderId)
        require(scenario != null && scenario.nonEmpty, "trusted TA scenario required")
        new BankTaEffectBindings(order, client, bridge, scenario).installed
      }
      Host.install(Host.Bindings(
        execute = Host.EffectBinding("bankwealth.BankTaEffectExecute", "bank-v1-1", (operation: BankTaEffectOperation) =>
          bindings(operation).execute(operation)),
        query = Host.EffectBinding("bankwealth.BankTaEffectQuery", "bank-v1-1", (operation: BankTaEffectOperation) =>
          bindings(operation).query(operation)),
        reconcile = Host.EffectBinding("bankwealth.BankTaEffectReconcilePort", "bank-v1-1", (input: BankTaEffectReconcile) =>
          bindings(BankTaEffectOperation(input.operation, input.request)).reconcile(input))
      ))
    }
  }
}

final class BankTaEffectBindings(order: ActorRef[FundOrderProtocol.Command], client: MockTAClient, bridge: BankTaBridge,
    scenario: String)(implicit system: ActorSystem[_]) {
  require(order != null && client != null && bridge != null && scenario != null && scenario.nonEmpty,
    "complete trusted TA effect binding required")
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)
  private def verify(operation: BankTaEffectOperation): Future[FundOrderEntity.State] = {
    val request = operation.request
    val parent = Execution.State(Execution.Inputs(request.taRequestId, request.fundOrderId, request.paymentTxId))
    require(operation.operation == Host.operationIdentity(parent), "TA effect operation identity mismatch")
    order.ask[FundOrderEntity.State](FundOrderProtocol.GetState).map { state =>
      require(state.id == request.fundOrderId && state.selectedPaymentTxId == request.paymentTxId && state.taRequestId == request.taRequestId &&
        state.cashPaymentFinalResults.get(request.paymentTxId).contains("succeeded"), "TA effect requires exact retained paid request")
      state
    }
  }
  private def observation(operation: BankTaEffectOperation, response: com.fasterxml.jackson.databind.JsonNode): BankTaEffectObservation = {
    require(response.path("requestId").asText() == operation.request.taRequestId.value && response.path("canonicalReceipts").isArray, "TA response association mismatch")
    val known = response.path("request").isObject && response.get("canonicalReceipts").size() > 0
    val absent = BankTaEffectBindings.authoritativeAbsence(response, operation.request.taRequestId.value)
    BankTaEffectObservation(operation.operation, operation.request, if (known) "confirmed" else if (absent) "absent" else "unknown", response.toString,
      if (known) Some(BankTaEffectResult(operation.request.taRequestId)) else None)
  }
  private def authorizeRetry(input: BankTaEffectReconcile): Future[Boolean] = {
    if (input == null || input.authorization != BankTaEffectBindings.RecoveryAuthorization || input.decision != Host.ReconcileDecision.Retry ||
        input.evidence == null || !input.evidence.exists(e => e != null && e.operation == input.operation &&
          e.request == input.request && e.status == "absent" && e.result.isEmpty && e.evidence != null && e.evidence.nonEmpty))
      Future.successful(false)
    else {
      val operation = BankTaEffectOperation(input.operation, input.request)
      verify(operation).flatMap(_ => bridge.reconcile(scenario)).map { current =>
        val prior = new com.fasterxml.jackson.databind.ObjectMapper().readTree(input.evidence.get.evidence)
        BankTaEffectBindings.authoritativeAbsence(prior, input.request.taRequestId.value) &&
          BankTaEffectBindings.authoritativeAbsence(current, input.request.taRequestId.value) && prior == current
      }.recover { case scala.util.control.NonFatal(_) => false }
    }
  }
  val installed: Host.Installed = Host.install(Host.Bindings(
    execute = Host.EffectBinding("bankwealth.BankTaEffectExecute", "bank-v1-1", (operation: BankTaEffectOperation) =>
      verify(operation).flatMap(_ => bridge.submit(scenario)).map(observation(operation, _))),
    query = Host.EffectBinding("bankwealth.BankTaEffectQuery", "bank-v1-1", (operation: BankTaEffectOperation) =>
      verify(operation).flatMap(_ => bridge.reconcile(scenario)).map(response => Some(observation(operation, response)))),
    reconcile = Host.EffectBinding("bankwealth.BankTaEffectReconcilePort", "bank-v1-1", authorizeRetry)
  ))
}
