// LOCKED EXECUTABLE BDD/TDD ORACLE — 1.0 STRICT-GOVERNANCE ARCHITECTURE (DO NOT MODIFY)
// source: fund-quota-reserve.ears
// canonicalSha256: 86de0630fffd85abb89581bf45640d55c190245e3fb8e324ad0465b8f9f6e01f
// testIrSha256: 54f1b020c3b4d34915b30552b8e92fba9eb876c220755bece38a74ba70e82db3
// layer: domain | tier: L1 | logic: QF_AUFLIA
package example.bankwealth.v2.domain.invariants

import org.scalatest.funsuite.AnyFunSuite
import example.bankwealth.v2.domain.entities.FundQuotaAxioms
import example.bankwealth.v2.domain.entities.FundQuotaEntity
import example.bankwealth.v2.domain.invariants.params.FundQuotaRuleParams
import example.bankwealth.v2.domain.services.FundQuotaComputations
import example.bankwealth.v2.domain.values._

final class FundQuotaReserveSubscriptionQuotaEarsSpec extends AnyFunSuite {
  // @CoArisingSpec(id="QUOTA_AMOUNT_RANGE", witness="z3-qf_auflia-quota_amount_range-primary")
  test("[QUOTA_AMOUNT_RANGE] (primary) ReserveSubscriptionQuota -> reject QUOTA_AMOUNT_RANGE") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.00"), maxSingleLimit = BigDecimal("0.00"), fundTotalUsed = BigDecimal("0.00"), fundTotalCap = BigDecimal("0.00"), perAccountCap = BigDecimal("0.00"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.01"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_AMOUNT_RANGE")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_AMOUNT_RANGE", witness="z3-qf_auflia-quota_amount_range-secondary")
  test("[QUOTA_AMOUNT_RANGE] (secondary) ReserveSubscriptionQuota -> reject QUOTA_AMOUNT_RANGE") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.01"), maxSingleLimit = BigDecimal("0.01"), fundTotalUsed = BigDecimal("0.01"), fundTotalCap = BigDecimal("0.01"), perAccountCap = BigDecimal("0.01"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.02"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_AMOUNT_RANGE")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_AMOUNT_RANGE", witness="z3-qf_auflia-quota_amount_range-boundary-1")
  test("[QUOTA_AMOUNT_RANGE] (boundary-1) ReserveSubscriptionQuota -> reject QUOTA_AMOUNT_RANGE") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.01"), maxSingleLimit = BigDecimal("0.00"), fundTotalUsed = BigDecimal("0.00"), fundTotalCap = BigDecimal("0.00"), perAccountCap = BigDecimal("0.00"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.01"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_AMOUNT_RANGE")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_AMOUNT_RANGE", witness="z3-qf_auflia-quota_amount_range-boundary-2")
  test("[QUOTA_AMOUNT_RANGE] (boundary-2) ReserveSubscriptionQuota -> reject QUOTA_AMOUNT_RANGE") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.01"), maxSingleLimit = BigDecimal("0.00"), fundTotalUsed = BigDecimal("0.00"), fundTotalCap = BigDecimal("0.00"), perAccountCap = BigDecimal("0.00"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.00"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_AMOUNT_RANGE")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_FUND_CAP", witness="z3-qf_auflia-quota_fund_cap-primary")
  test("[QUOTA_FUND_CAP] (primary) ReserveSubscriptionQuota -> reject QUOTA_FUND_CAP") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.00"), maxSingleLimit = BigDecimal("0.01"), fundTotalUsed = BigDecimal("0.00"), fundTotalCap = BigDecimal("0.00"), perAccountCap = BigDecimal("0.00"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.01"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_FUND_CAP")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_FUND_CAP", witness="z3-qf_auflia-quota_fund_cap-secondary")
  test("[QUOTA_FUND_CAP] (secondary) ReserveSubscriptionQuota -> reject QUOTA_FUND_CAP") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.01"), maxSingleLimit = BigDecimal("0.02"), fundTotalUsed = BigDecimal("0.01"), fundTotalCap = BigDecimal("0.01"), perAccountCap = BigDecimal("0.01"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.02"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_FUND_CAP")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_ACCOUNT_CAP", witness="z3-qf_auflia-quota_account_cap-primary")
  test("[QUOTA_ACCOUNT_CAP] (primary) ReserveSubscriptionQuota -> reject QUOTA_ACCOUNT_CAP") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.00"), maxSingleLimit = BigDecimal("0.01"), fundTotalUsed = BigDecimal("0.00"), fundTotalCap = BigDecimal("0.01"), perAccountCap = BigDecimal("0.00"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.01"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_ACCOUNT_CAP")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_ACCOUNT_CAP", witness="z3-qf_auflia-quota_account_cap-secondary")
  test("[QUOTA_ACCOUNT_CAP] (secondary) ReserveSubscriptionQuota -> reject QUOTA_ACCOUNT_CAP") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.01"), maxSingleLimit = BigDecimal("0.02"), fundTotalUsed = BigDecimal("0.01"), fundTotalCap = BigDecimal("0.03"), perAccountCap = BigDecimal("0.01"), accountUsed = Map("" -> BigDecimal("0.01")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "", amount = BigDecimal("0.02"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Left(err) => assert(err.code == "QUOTA_ACCOUNT_CAP")
      case Right(events) => fail(s"expected rejection, got events: $events")
    }
  }

  // @CoArisingSpec(id="QUOTA_RESERVED", witness="z3-qf_auflia-quota_reserved-primary")
  test("[QUOTA_RESERVED] (primary) ReserveSubscriptionQuota -> emit SubscriptionQuotaReserved") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.00"), maxSingleLimit = BigDecimal("0.00"), fundTotalUsed = BigDecimal("0.00"), fundTotalCap = BigDecimal("0.00"), perAccountCap = BigDecimal("0.00"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.00"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Right(events) =>
        assert(events.map(_.getClass.getSimpleName) == List("SubscriptionQuotaReserved"))
        val nextState = FundQuotaAxioms.replay(state, events)
        assert(FundQuotaAxioms.checkAxioms(nextState).isEmpty)
        assert(nextState.fundTotalUsed == BigDecimal("0.00"))
        assert(nextState.accountUsed.get("id_2").contains(BigDecimal("0.00")))
      case Left(err) => fail(s"expected acceptance, got rejection: $err")
    }
  }

  // @CoArisingSpec(id="QUOTA_RESERVED", witness="z3-qf_auflia-quota_reserved-secondary")
  test("[QUOTA_RESERVED] (secondary) ReserveSubscriptionQuota -> emit SubscriptionQuotaReserved") {
    val state = FundQuotaEntity.State(minPurchase = BigDecimal("0.01"), maxSingleLimit = BigDecimal("0.01"), fundTotalUsed = BigDecimal("0.01"), fundTotalCap = BigDecimal("0.02"), perAccountCap = BigDecimal("0.01"), accountUsed = Map("id_2" -> BigDecimal("0.00")))
    val params = FundQuotaRuleParams.ReserveSubscriptionQuotaParams(accountId = "id_2", amount = BigDecimal("0.01"))
    val rule = new FundQuotaRules.ReserveSubscriptionQuotaRule(FundQuotaComputations.Noop)
    val outcome = rule.apply(state, params)
    outcome match {
      case Right(events) =>
        assert(events.map(_.getClass.getSimpleName) == List("SubscriptionQuotaReserved"))
        val nextState = FundQuotaAxioms.replay(state, events)
        assert(FundQuotaAxioms.checkAxioms(nextState).isEmpty)
        assert(nextState.fundTotalUsed == BigDecimal("0.02"))
        assert(nextState.accountUsed.get("id_2").contains(BigDecimal("0.01")))
      case Left(err) => fail(s"expected acceptance, got rejection: $err")
    }
  }

}
