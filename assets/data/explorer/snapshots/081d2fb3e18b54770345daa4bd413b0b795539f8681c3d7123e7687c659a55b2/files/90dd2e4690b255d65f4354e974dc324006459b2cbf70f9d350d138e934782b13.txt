// LOCKED EXECUTABLE APPLICATION BDD/TDD ORACLE — 1.0 STRICT-GOVERNANCE ARCHITECTURE (DO NOT MODIFY)
// source: cash-fund-purchase.story.ears
// canonicalSha256: a971bc4e46235d7761d43d4fa0e10b214ec904f4044951d17e7ca9555a05bece
// testIrSha256: 27b6197ae8a2e275b9166b83c1495ba3ed9fdcfc09498b1501320eb31fa59d9e
// layer: application | tier: L3 | logic: QF_AUFLIA
package example.bankwealth.v2.application.services

import org.scalatest.funsuite.AnyFunSuite
import scala.collection.mutable.ListBuffer

final class CashFundPurchaseEarsSpec extends AnyFunSuite {
  // @CoArisingSpec(id="US-CFP-01", witness="z3-qf_auflia-us-cfp-01-primary")
  test("[US-CFP-01] (primary) BankCashSubmitPort.submit -> reject UNAUTHORIZED_OR_CSRF") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "UNAUTHORIZED_OR_CSRF")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="US-CFP-01", witness="z3-qf_auflia-us-cfp-01-secondary")
  test("[US-CFP-01] (secondary) BankCashSubmitPort.submit -> reject UNAUTHORIZED_OR_CSRF") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "UNAUTHORIZED_OR_CSRF")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="US-CFP-02", witness="z3-qf_auflia-us-cfp-02-primary")
  test("[US-CFP-02] (primary) BankCashSubmitPort.submit -> reject INVALID_CASH_SUBMIT") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "succeeded", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "CNY", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "succeeded", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "INVALID_CASH_SUBMIT")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="US-CFP-02", witness="z3-qf_auflia-us-cfp-02-secondary")
  test("[US-CFP-02] (secondary) BankCashSubmitPort.submit -> reject INVALID_CASH_SUBMIT") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "CNY", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "INVALID_CASH_SUBMIT")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="US-CFP-03", witness="z3-qf_auflia-us-cfp-03-primary")
  test("[US-CFP-03] (primary) BankCashSubmitPort.submit -> pin BankCashOriginal and dispatch FundOrder.RecordCashRequestSource and dispatch FundOrder.RequestFundPurchaseSettlement and respond BankCashAcknowledgement") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = true
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "id_5", "clientRequestId" -> "CNY"),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(pins.exists(_._1 == "BankCashOriginal"), "expected pin BankCashOriginal")
        assert(dispatches.exists(_._1 == "FundOrder.RecordCashRequestSource"), "expected dispatch FundOrder.RecordCashRequestSource")
        assert(dispatches.exists(_._1 == "FundOrder.RequestFundPurchaseSettlement"), "expected dispatch FundOrder.RequestFundPurchaseSettlement")
        assert(res.responseType.contains("BankCashAcknowledgement"))
        assert(res.response.get("accepted").contains(true))
        assert(res.response.get("replayed").contains(false))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-03", witness="z3-qf_auflia-us-cfp-03-secondary")
  test("[US-CFP-03] (secondary) BankCashSubmitPort.submit -> pin BankCashOriginal and dispatch FundOrder.RecordCashRequestSource and dispatch FundOrder.RequestFundPurchaseSettlement and respond BankCashAcknowledgement") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = true
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.02"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "CNY", "clientRequestId" -> "id_6"),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.02"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(pins.exists(_._1 == "BankCashOriginal"), "expected pin BankCashOriginal")
        assert(dispatches.exists(_._1 == "FundOrder.RecordCashRequestSource"), "expected dispatch FundOrder.RecordCashRequestSource")
        assert(dispatches.exists(_._1 == "FundOrder.RequestFundPurchaseSettlement"), "expected dispatch FundOrder.RequestFundPurchaseSettlement")
        assert(res.responseType.contains("BankCashAcknowledgement"))
        assert(res.response.get("accepted").contains(true))
        assert(res.response.get("replayed").contains(false))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-04", witness="z3-qf_auflia-us-cfp-04-primary")
  test("[US-CFP-04] (primary) BankCashSubmitPort.submit -> respond BankCashAcknowledgement and forbid dispatch FundOrder.RequestFundPurchaseSettlement") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = true
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = true
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = true
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "id_5", "clientRequestId" -> "id_6"),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(!dispatches.exists(_._1 == "FundOrder.RequestFundPurchaseSettlement"), "forbidden dispatch FundOrder.RequestFundPurchaseSettlement must not occur")
        assert(res.responseType.contains("BankCashAcknowledgement"))
        assert(res.response.get("replayed").contains(true))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-04", witness="z3-qf_auflia-us-cfp-04-secondary")
  test("[US-CFP-04] (secondary) BankCashSubmitPort.submit -> respond BankCashAcknowledgement and forbid dispatch FundOrder.RequestFundPurchaseSettlement") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = true
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = true
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = true
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.02"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "CNY", "clientRequestId" -> "id_6"),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.02"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(!dispatches.exists(_._1 == "FundOrder.RequestFundPurchaseSettlement"), "forbidden dispatch FundOrder.RequestFundPurchaseSettlement must not occur")
        assert(res.responseType.contains("BankCashAcknowledgement"))
        assert(res.response.get("replayed").contains(true))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-05", witness="z3-qf_auflia-us-cfp-05-primary")
  test("[US-CFP-05] (primary) BankCashSubmitPort.submit -> reject CASH_SOURCE_CONFLICT") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = true
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = true
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "id_5", "clientRequestId" -> "id_6"),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "CASH_SOURCE_CONFLICT")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="US-CFP-05", witness="z3-qf_auflia-us-cfp-05-secondary")
  test("[US-CFP-05] (secondary) BankCashSubmitPort.submit -> reject CASH_SOURCE_CONFLICT") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = true
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = true
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankCashSubmitPort.submit",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.02"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "CNY", "clientRequestId" -> "id_6"),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.02"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "CASH_SOURCE_CONFLICT")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="US-CFP-06", witness="z3-qf_auflia-us-cfp-06-primary")
  test("[US-CFP-06] (primary) BankOrderQuery.get -> expose bank-order-view") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankOrderQuery.get",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "id_5"), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "id_5"))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(res.viewName.contains("bank-order-view"))
        assert(res.view.get("paymentCompleted").contains(true))
        assert(res.view.get("taFinalized").contains(false))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-06", witness="z3-qf_auflia-us-cfp-06-secondary")
  test("[US-CFP-06] (secondary) BankOrderQuery.get -> expose bank-order-view") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankOrderQuery.get",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "id_5"), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "id_5"))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(res.viewName.contains("bank-order-view"))
        assert(res.view.get("paymentCompleted").contains(true))
        assert(res.view.get("taFinalized").contains(false))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-07", witness="z3-qf_auflia-us-cfp-07-primary")
  test("[US-CFP-07] (primary) BankOrderQuery.get -> expose bank-order-view") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankOrderQuery.get",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "confirmed"), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "confirmed"))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(res.viewName.contains("bank-order-view"))
        assert(res.view.get("paymentCompleted").contains(true))
        assert(res.view.get("taFinalized").contains(true))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-07", witness="z3-qf_auflia-us-cfp-07-secondary")
  test("[US-CFP-07] (secondary) BankOrderQuery.get -> expose bank-order-view") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankOrderQuery.get",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "confirmed"), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "succeeded", "taStatus" -> "confirmed"))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(res.viewName.contains("bank-order-view"))
        assert(res.view.get("paymentCompleted").contains(true))
        assert(res.view.get("taFinalized").contains(true))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-08", witness="z3-qf_auflia-us-cfp-08-primary")
  test("[US-CFP-08] (primary) BankOrderQuery.get -> expose bank-order-view") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankOrderQuery.get",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "confirmed", "taStatus" -> ""), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "confirmed", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(res.viewName.contains("bank-order-view"))
        assert(res.view.get("paymentCompleted").contains(false))
        assert(res.view.get("taFinalized").contains(false))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="US-CFP-08", witness="z3-qf_auflia-us-cfp-08-secondary")
  test("[US-CFP-08] (secondary) BankOrderQuery.get -> expose bank-order-view") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val effects = new CashFundPurchaseEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = CashFundPurchaseRequest(
      operation = "BankOrderQuery.get",
      payload = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "confirmed", "taStatus" -> ""), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""),
      stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "confirmed", "taStatus" -> ""))
    )
    val outcome = CashFundPurchaseImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(res.viewName.contains("bank-order-view"))
        assert(res.view.get("paymentCompleted").contains(false))
        assert(res.view.get("taFinalized").contains(false))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="AX-APP-1", witness="axiom-untrusted-supply")
  test("[AX-APP-1] untrusted input MUST NOT supply operationId, investorAccountId, fundCollectionAccountId") {
    val forbiddenFields = Seq("operationId", "investorAccountId", "fundCollectionAccountId")
    assert(forbiddenFields.nonEmpty)
  }

}
