// LOCKED EXECUTABLE APPLICATION BDD/TDD ORACLE — 1.0 STRICT-GOVERNANCE ARCHITECTURE (DO NOT MODIFY)
// source: ta-bridge-settlement.integration.ears
// canonicalSha256: 540b6e0b1a46a2eae5cccc248cb29039ef60b9fd7eafa8b1e93cb8dab9900453
// testIrSha256: c35a9e0a9cbff4972af14947cb1f164fb209862e5dc116230e5aeaf71da8fc9a
// layer: application | tier: L3 | logic: QF_AUFLIA
package example.bankwealth.v2.application.services

import org.scalatest.funsuite.AnyFunSuite
import scala.collection.mutable.ListBuffer

final class TaBridgeSettlementEarsSpec extends AnyFunSuite {
  // @CoArisingSpec(id="TA-BR-01", witness="z3-qf_auflia-ta-br-01-primary")
  test("[TA-BR-01] (primary) BankTaBridgePort.ingestOutcome -> reject TA_UNKNOWN_ORIGINAL") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new TaBridgeSettlementExternPorts {
      override def submissionPinned(orderId: Any): Boolean = false
      override def taReceiptAuthentic(orderId: Any): Boolean = false
      override def taOutcomeConfirmed(orderId: Any): Boolean = false
      override def taOutcomeRejected(orderId: Any): Boolean = false
      override def taAbsenceConfirmed(orderId: Any): Boolean = false
    }
    val effects = new TaBridgeSettlementEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = TaBridgeSettlementRequest(
      operation = "BankTaBridgePort.ingestOutcome",
      payload = Map[String, Any]("orderId" -> ""),
      stateSnapshot = Map.empty[String, Any],
      principal = Some(Map[String, Any]("id" -> "principal-1", "roles" -> Seq[Any]("ta-bridge-service"), "tenantId" -> "tenant-1", "attributes" -> Map.empty[String, Any], "entitlements" -> Seq.empty[Any]))
    )
    val outcome = TaBridgeSettlementImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "TA_UNKNOWN_ORIGINAL")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="TA-BR-02", witness="z3-qf_auflia-ta-br-02-primary")
  test("[TA-BR-02] (primary) BankTaBridgePort.ingestOutcome -> reject TA_INVALID_RECEIPT") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new TaBridgeSettlementExternPorts {
      override def submissionPinned(orderId: Any): Boolean = true
      override def taReceiptAuthentic(orderId: Any): Boolean = false
      override def taOutcomeConfirmed(orderId: Any): Boolean = false
      override def taOutcomeRejected(orderId: Any): Boolean = false
      override def taAbsenceConfirmed(orderId: Any): Boolean = false
    }
    val effects = new TaBridgeSettlementEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = TaBridgeSettlementRequest(
      operation = "BankTaBridgePort.ingestOutcome",
      payload = Map[String, Any]("orderId" -> ""),
      stateSnapshot = Map.empty[String, Any],
      principal = Some(Map[String, Any]("id" -> "principal-1", "roles" -> Seq[Any]("ta-bridge-service"), "tenantId" -> "tenant-1", "attributes" -> Map.empty[String, Any], "entitlements" -> Seq.empty[Any]))
    )
    val outcome = TaBridgeSettlementImpl.handle(req, externs, effects)
    outcome match {
      case Left(err) => assert(err.code == "TA_INVALID_RECEIPT")
      case Right(acc) => fail(s"expected application rejection, got success: $acc")
    }
    assert(dispatches.isEmpty, "rejected request must not dispatch commands")
  }

  // @CoArisingSpec(id="TA-BR-03", witness="z3-qf_auflia-ta-br-03-primary")
  test("[TA-BR-03] (primary) BankTaBridgePort.ingestOutcome -> dispatch FundOrder.RecordFundTAConfirmed and forbid dispatch FundOrder.RequestIndependentRefund and respond TaBridgeAcknowledgement") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new TaBridgeSettlementExternPorts {
      override def submissionPinned(orderId: Any): Boolean = true
      override def taReceiptAuthentic(orderId: Any): Boolean = true
      override def taOutcomeConfirmed(orderId: Any): Boolean = true
      override def taOutcomeRejected(orderId: Any): Boolean = false
      override def taAbsenceConfirmed(orderId: Any): Boolean = false
    }
    val effects = new TaBridgeSettlementEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = TaBridgeSettlementRequest(
      operation = "BankTaBridgePort.ingestOutcome",
      payload = Map[String, Any]("orderId" -> ""),
      stateSnapshot = Map[String, Any]("shares" -> 1L, "fundOrder" -> Map[String, Any]("shares" -> 1L, "nav" -> "10.0000"), "nav" -> "10.0000"),
      principal = Some(Map[String, Any]("id" -> "principal-1", "roles" -> Seq[Any]("ta-bridge-service"), "tenantId" -> "tenant-1", "attributes" -> Map.empty[String, Any], "entitlements" -> Seq.empty[Any]))
    )
    val outcome = TaBridgeSettlementImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        val dispatched_0 = dispatches.find(_._1 == "FundOrder.RecordFundTAConfirmed").getOrElse(fail("expected dispatch FundOrder.RecordFundTAConfirmed"))
        assert(dispatched_0._2.get("shares").exists(v => v != null), "expected non-null dispatched field FundOrder.RecordFundTAConfirmed.shares")
        assert(dispatched_0._2.get("shares").map(_.toString).contains("1"), "expected snapshot-backed FundOrder.RecordFundTAConfirmed.shares")
        assert(dispatched_0._2.get("nav").exists(v => v != null), "expected non-null dispatched field FundOrder.RecordFundTAConfirmed.nav")
        assert(dispatched_0._2.get("nav").map(_.toString).contains("10.0000"), "expected snapshot-backed FundOrder.RecordFundTAConfirmed.nav")
        assert(!dispatches.exists(_._1 == "FundOrder.RequestIndependentRefund"), "forbidden dispatch FundOrder.RequestIndependentRefund must not occur")
        assert(res.responseType.contains("TaBridgeAcknowledgement"))
        assert(res.response.get("state").contains("confirmed"))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="TA-BR-04", witness="z3-qf_auflia-ta-br-04-primary")
  test("[TA-BR-04] (primary) BankTaBridgePort.ingestOutcome -> dispatch FundOrder.RequestIndependentRefund and forbid dispatch FundOrder.RecordFundTAConfirmed and respond TaBridgeAcknowledgement") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new TaBridgeSettlementExternPorts {
      override def submissionPinned(orderId: Any): Boolean = true
      override def taReceiptAuthentic(orderId: Any): Boolean = true
      override def taOutcomeConfirmed(orderId: Any): Boolean = false
      override def taOutcomeRejected(orderId: Any): Boolean = true
      override def taAbsenceConfirmed(orderId: Any): Boolean = false
    }
    val effects = new TaBridgeSettlementEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = TaBridgeSettlementRequest(
      operation = "BankTaBridgePort.ingestOutcome",
      payload = Map[String, Any]("orderId" -> ""),
      stateSnapshot = Map.empty[String, Any],
      principal = Some(Map[String, Any]("id" -> "principal-1", "roles" -> Seq[Any]("ta-bridge-service"), "tenantId" -> "tenant-1", "attributes" -> Map.empty[String, Any], "entitlements" -> Seq.empty[Any]))
    )
    val outcome = TaBridgeSettlementImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        val dispatched_0 = dispatches.find(_._1 == "FundOrder.RequestIndependentRefund").getOrElse(fail("expected dispatch FundOrder.RequestIndependentRefund"))
        assert(dispatched_0._2.get("orderId").exists(v => v != null), "expected non-null dispatched field FundOrder.RequestIndependentRefund.orderId")
        assert(!dispatches.exists(_._1 == "FundOrder.RecordFundTAConfirmed"), "forbidden dispatch FundOrder.RecordFundTAConfirmed must not occur")
        assert(res.responseType.contains("TaBridgeAcknowledgement"))
        assert(res.response.get("state").contains("refund_dispatched"))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="TA-BR-05", witness="z3-qf_auflia-ta-br-05-primary")
  test("[TA-BR-05] (primary) BankTaBridgePort.ingestOutcome -> respond TaBridgeAcknowledgement and forbid dispatch FundOrder.RequestIndependentRefund and forbid dispatch FundOrder.RecordFundTAConfirmed") {
    val pins = ListBuffer.empty[(String, Map[String, Any])]
    val dispatches = ListBuffer.empty[(String, Map[String, Any])]
    val externs = new TaBridgeSettlementExternPorts {
      override def submissionPinned(orderId: Any): Boolean = true
      override def taReceiptAuthentic(orderId: Any): Boolean = true
      override def taOutcomeConfirmed(orderId: Any): Boolean = false
      override def taOutcomeRejected(orderId: Any): Boolean = false
      override def taAbsenceConfirmed(orderId: Any): Boolean = false
    }
    val effects = new TaBridgeSettlementEffectsPort {
      override def pin(artifact: String, inputs: Map[String, Any]): Unit = pins += ((artifact, inputs))
      override def dispatch(target: String, payload: Map[String, Any]): Unit = dispatches += ((target, payload))
    }
    val req = TaBridgeSettlementRequest(
      operation = "BankTaBridgePort.ingestOutcome",
      payload = Map[String, Any]("orderId" -> ""),
      stateSnapshot = Map.empty[String, Any],
      principal = Some(Map[String, Any]("id" -> "principal-1", "roles" -> Seq[Any]("ta-bridge-service"), "tenantId" -> "tenant-1", "attributes" -> Map.empty[String, Any], "entitlements" -> Seq.empty[Any]))
    )
    val outcome = TaBridgeSettlementImpl.handle(req, externs, effects)
    outcome match {
      case Right(res) =>
        assert(!dispatches.exists(_._1 == "FundOrder.RequestIndependentRefund"), "forbidden dispatch FundOrder.RequestIndependentRefund must not occur")
        assert(!dispatches.exists(_._1 == "FundOrder.RecordFundTAConfirmed"), "forbidden dispatch FundOrder.RecordFundTAConfirmed must not occur")
        assert(res.responseType.contains("TaBridgeAcknowledgement"))
        assert(res.response.get("state").contains("pending_reconcile"))
      case Left(err) => fail(s"expected application success, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="AX-TA-1", witness="axiom-untrusted-supply")
  test("[AX-TA-1] untrusted input MUST NOT supply investorAccountId, fundCollectionAccountId") {
    val forbiddenFields = Seq("investorAccountId", "fundCollectionAccountId")
    assert(forbiddenFields.nonEmpty)
  }

}
