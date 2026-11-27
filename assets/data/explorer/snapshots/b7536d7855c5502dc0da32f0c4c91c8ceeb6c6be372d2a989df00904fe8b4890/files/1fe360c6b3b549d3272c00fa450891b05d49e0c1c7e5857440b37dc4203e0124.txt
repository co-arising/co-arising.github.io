// LOCKED EXECUTABLE BDD/TDD ORACLE — 1.0 STRICT-GOVERNANCE ARCHITECTURE (DO NOT MODIFY)
// source: credit-balance-reserve.ears
// canonicalSha256: dbeb1abcc51decfdbbad0ade44354ba8bda2a0a89b7a0657e289acd7aa689454
// testIrSha256: beb6512067cb7482a46a831b02bf338099806d1b272f06bfac2d99a0c0649d8a
// layer: domain | tier: L1 | logic: QF_AUFLIA
package example.bankwealth.v2.domain.invariants

import org.scalatest.funsuite.AnyFunSuite
import example.bankwealth.v2.domain.entities.CreditBalanceAxioms
import example.bankwealth.v2.domain.entities.CreditBalanceEntity
import example.bankwealth.v2.domain.invariants.params.CreditBalanceRuleParams
import example.bankwealth.v2.domain.services.CreditBalanceComputations
import example.bankwealth.v2.domain.values._

final class CreditBalanceReserveFundsEarsSpec extends AnyFunSuite {
  // @CoArisingSpec(id="BAL_NON_POSITIVE_AMOUNT", witness="z3-qf_auflia-bal_non_positive_amount-primary")
  test("[BAL_NON_POSITIVE_AMOUNT] (primary) ReserveFunds -> reject BAL_NON_POSITIVE_AMOUNT") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.00"), reservedTotal = BigDecimal("0.00"), reservedByTx = Map.empty[String, BigDecimal])
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.00"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "BAL_NON_POSITIVE_AMOUNT")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="BAL_NON_POSITIVE_AMOUNT", witness="z3-qf_auflia-bal_non_positive_amount-secondary")
  test("[BAL_NON_POSITIVE_AMOUNT] (secondary) ReserveFunds -> reject BAL_NON_POSITIVE_AMOUNT") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.01"), reservedTotal = BigDecimal("0.01"), reservedByTx = Map.empty[String, BigDecimal])
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.00"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "BAL_NON_POSITIVE_AMOUNT")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="BAL_TX_ALREADY_RESERVED", witness="z3-qf_auflia-bal_tx_already_reserved-primary")
  test("[BAL_TX_ALREADY_RESERVED] (primary) ReserveFunds -> reject BAL_TX_ALREADY_RESERVED") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.00"), reservedTotal = BigDecimal("0.00"), reservedByTx = Map("" -> BigDecimal("0.00")))
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.01"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "BAL_TX_ALREADY_RESERVED")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="BAL_TX_ALREADY_RESERVED", witness="z3-qf_auflia-bal_tx_already_reserved-secondary")
  test("[BAL_TX_ALREADY_RESERVED] (secondary) ReserveFunds -> reject BAL_TX_ALREADY_RESERVED") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.01"), reservedTotal = BigDecimal("0.01"), reservedByTx = Map("" -> BigDecimal("0.00")))
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.02"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "BAL_TX_ALREADY_RESERVED")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="BAL_INSUFFICIENT_FUNDS", witness="z3-qf_auflia-bal_insufficient_funds-primary")
  test("[BAL_INSUFFICIENT_FUNDS] (primary) ReserveFunds -> reject BAL_INSUFFICIENT_FUNDS") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.00"), reservedTotal = BigDecimal("0.00"), reservedByTx = Map.empty[String, BigDecimal])
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.01"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "BAL_INSUFFICIENT_FUNDS")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="BAL_INSUFFICIENT_FUNDS", witness="z3-qf_auflia-bal_insufficient_funds-secondary")
  test("[BAL_INSUFFICIENT_FUNDS] (secondary) ReserveFunds -> reject BAL_INSUFFICIENT_FUNDS") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.01"), reservedTotal = BigDecimal("0.01"), reservedByTx = Map.empty[String, BigDecimal])
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.02"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "BAL_INSUFFICIENT_FUNDS")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="BAL_FUNDS_RESERVED", witness="z3-qf_auflia-bal_funds_reserved-primary")
  test("[BAL_FUNDS_RESERVED] (primary) ReserveFunds -> emit FundsReserved") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.01"), reservedTotal = BigDecimal("0.00"), reservedByTx = Map.empty[String, BigDecimal])
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.01"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Right(events) =>
        assert(events.map(_.getClass.getSimpleName) == List("FundsReserved"))
        val nextState = CreditBalanceAxioms.replay(state, events)
        assert(CreditBalanceAxioms.checkAxioms(nextState).isEmpty)
        assert(nextState.availableAmount == BigDecimal("0.00"))
        assert(nextState.reservedTotal == BigDecimal("0.01"))
        assert(nextState.reservedByTx.get("").contains(BigDecimal("0.01")))
      case Left(err) => fail(s"expected acceptance, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="BAL_FUNDS_RESERVED", witness="z3-qf_auflia-bal_funds_reserved-secondary")
  test("[BAL_FUNDS_RESERVED] (secondary) ReserveFunds -> emit FundsReserved") {
    val state = CreditBalanceEntity.State(availableAmount = BigDecimal("0.02"), reservedTotal = BigDecimal("0.01"), reservedByTx = Map.empty[String, BigDecimal])
    val params = CreditBalanceRuleParams.ReserveFundsParams(txId = "", amount = BigDecimal("0.02"))
    val rule = new CreditBalanceRules.ReserveFundsRule(CreditBalanceComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Right(events) =>
        assert(events.map(_.getClass.getSimpleName) == List("FundsReserved"))
        val nextState = CreditBalanceAxioms.replay(state, events)
        assert(CreditBalanceAxioms.checkAxioms(nextState).isEmpty)
        assert(nextState.availableAmount == BigDecimal("0.00"))
        assert(nextState.reservedTotal == BigDecimal("0.03"))
        assert(nextState.reservedByTx.get("").contains(BigDecimal("0.02")))
      case Left(err) => fail(s"expected acceptance, got rejection: $err")
    }
  }

}
