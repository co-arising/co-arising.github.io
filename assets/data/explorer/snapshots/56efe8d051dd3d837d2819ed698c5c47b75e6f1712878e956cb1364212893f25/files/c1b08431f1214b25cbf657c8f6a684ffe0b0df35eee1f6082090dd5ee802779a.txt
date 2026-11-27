// LOCKED EXECUTABLE BDD/TDD ORACLE — 1.0 STRICT-GOVERNANCE ARCHITECTURE (DO NOT MODIFY)
// source: fund-order-confirm-ta-shares.ears
// canonicalSha256: 53a7bcd6f4ccfae41f63cd7b193ffc681c9f436d059389686c82de0c66f56393
// testIrSha256: 8e49e0d25e2c9e2374fc97ced6543cb076c440bd3b2d8b555846f39b971ddc7b
// layer: domain | tier: L2 | logic: QF_NIA
package example.bankwealth.v2.domain.invariants

import org.scalatest.funsuite.AnyFunSuite
import example.bankwealth.v2.domain.entities.FundOrderAxioms
import example.bankwealth.v2.domain.entities.FundOrderEntity
import example.bankwealth.v2.domain.invariants.params.FundOrderRuleParams
import example.bankwealth.v2.domain.services.impl.FundOrderConfirmTASharesImpl
import example.bankwealth.v2.domain.values._

final class FundOrderConfirmTASharesEarsSpec extends AnyFunSuite {
  // @CoArisingSpec(id="TA_INVALID_NAV", witness="z3-qf_nia-ta_invalid_nav-primary")
  test("[TA_INVALID_NAV] (primary) RecordFundTAConfirmed -> reject TA_INVALID_NAV") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("0.00"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 0L, nav = BigDecimal("0.0000"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_INVALID_NAV")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_INVALID_NAV", witness="z3-qf_nia-ta_invalid_nav-secondary")
  test("[TA_INVALID_NAV] (secondary) RecordFundTAConfirmed -> reject TA_INVALID_NAV") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("0.01"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 1L, nav = BigDecimal("0.0000"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_INVALID_NAV")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_SHARES_MISMATCH", witness="z3-qf_nia-ta_shares_mismatch-primary")
  test("[TA_SHARES_MISMATCH] (primary) RecordFundTAConfirmed -> reject TA_SHARES_MISMATCH") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("10000.00"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 1000000L, nav = BigDecimal("100.0000"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_SHARES_MISMATCH")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_SHARES_MISMATCH", witness="z3-qf_nia-ta_shares_mismatch-secondary")
  test("[TA_SHARES_MISMATCH] (secondary) RecordFundTAConfirmed -> reject TA_SHARES_MISMATCH") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("9999.99"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 999999L, nav = BigDecimal("99.9999"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_SHARES_MISMATCH")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_SHARES_MISMATCH", witness="z3-qf_nia-ta_shares_mismatch-boundary-1")
  test("[TA_SHARES_MISMATCH] (boundary-1) RecordFundTAConfirmed -> reject TA_SHARES_MISMATCH") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("0.01"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 0L, nav = BigDecimal("0.0100"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_SHARES_MISMATCH")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_SHARES_MISMATCH", witness="z3-qf_nia-ta_shares_mismatch-boundary-2")
  test("[TA_SHARES_MISMATCH] (boundary-2) RecordFundTAConfirmed -> reject TA_SHARES_MISMATCH") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("10000.00"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 99L, nav = BigDecimal("100.0000"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_SHARES_MISMATCH")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_PAYMENT_NOT_SUCCEEDED", witness="z3-qf_nia-ta_payment_not_succeeded-primary")
  test("[TA_PAYMENT_NOT_SUCCEEDED] (primary) RecordFundTAConfirmed -> reject TA_PAYMENT_NOT_SUCCEEDED") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("0.00"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 0L, nav = BigDecimal("0.0001"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_PAYMENT_NOT_SUCCEEDED")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_PAYMENT_NOT_SUCCEEDED", witness="z3-qf_nia-ta_payment_not_succeeded-secondary")
  test("[TA_PAYMENT_NOT_SUCCEEDED] (secondary) RecordFundTAConfirmed -> reject TA_PAYMENT_NOT_SUCCEEDED") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("10000.00"), paymentOutcome = "", taStatus = "")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 100L, nav = BigDecimal("100.0000"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_PAYMENT_NOT_SUCCEEDED")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_ALREADY_CONFIRMED", witness="z3-qf_nia-ta_already_confirmed-primary")
  test("[TA_ALREADY_CONFIRMED] (primary) RecordFundTAConfirmed -> reject TA_ALREADY_CONFIRMED") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("0.00"), paymentOutcome = "succeeded", taStatus = "confirmed")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 0L, nav = BigDecimal("0.0001"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_ALREADY_CONFIRMED")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_ALREADY_CONFIRMED", witness="z3-qf_nia-ta_already_confirmed-secondary")
  test("[TA_ALREADY_CONFIRMED] (secondary) RecordFundTAConfirmed -> reject TA_ALREADY_CONFIRMED") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("0.04"), paymentOutcome = "succeeded", taStatus = "confirmed")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 133L, nav = BigDecimal("0.0003"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "TA_ALREADY_CONFIRMED")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="TA_CONFIRMED", witness="z3-qf_nia-ta_confirmed-primary")
  test("[TA_CONFIRMED] (primary) RecordFundTAConfirmed -> transition -> confirmed and emit FundTASharesConfirmed") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("0.00"), paymentOutcome = "succeeded", taStatus = "id_4")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 0L, nav = BigDecimal("0.0001"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Right(events) =>
        assert(events.map(_.getClass.getSimpleName) == List("FundTASharesConfirmed"))
        val nextState = FundOrderAxioms.replay(state, events)
        assert(FundOrderAxioms.checkAxioms(nextState).isEmpty)
        assert(nextState.taStatus == "confirmed")
      case Left(err) => fail(s"expected acceptance, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="TA_CONFIRMED", witness="z3-qf_nia-ta_confirmed-secondary")
  test("[TA_CONFIRMED] (secondary) RecordFundTAConfirmed -> transition -> confirmed and emit FundTASharesConfirmed") {
    val state = FundOrderEntity.State(netAmount = BigDecimal("10000.00"), paymentOutcome = "succeeded", taStatus = "id_4")
    val params = FundOrderRuleParams.RecordFundTAConfirmedParams(shares = 100L, nav = BigDecimal("100.0000"))
    val outcome = FundOrderConfirmTASharesImpl.apply(state, params)
    outcome match {
      case Right(events) =>
        assert(events.map(_.getClass.getSimpleName) == List("FundTASharesConfirmed"))
        val nextState = FundOrderAxioms.replay(state, events)
        assert(FundOrderAxioms.checkAxioms(nextState).isEmpty)
        assert(nextState.taStatus == "confirmed")
      case Left(err) => fail(s"expected acceptance, got rejection: $err")
    }
  }

}
