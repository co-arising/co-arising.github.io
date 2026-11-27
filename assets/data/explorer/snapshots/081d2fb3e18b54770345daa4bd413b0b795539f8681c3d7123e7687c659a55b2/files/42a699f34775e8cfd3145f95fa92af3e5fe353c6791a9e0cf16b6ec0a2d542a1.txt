// LOCKED EXECUTABLE INTERFACES HTTP ORACLE — 1.0 STRICT-GOVERNANCE ARCHITECTURE (DO NOT MODIFY)
// canonicalSha256: e988b3ce14a251c4bde60d36369b9dba38851b7debccd9ca131961af535067c3
// layer: interfaces | tests HttpRouter, Controllers, and OnionBootstrap DI composition
package example.bankwealth.v2.interfaces.http

import org.scalatest.funsuite.AnyFunSuite
import example.bankwealth.v2.application.services._
import example.bankwealth.v2.interfaces.api.{AuthorizationPort, AuthzDecisionQuery, HttpRequest, Principal, RoleBasedAuthority}
import example.bankwealth.v2.modules.OnionBootstrap

final class InterfacesHttpSpec extends AnyFunSuite {
  // @CoArisingSpec(id="INTERFACES_HEALTH", witness="http-health")
  test("[INTERFACES_HEALTH] GET /health -> 200 ok") {
    val rt = OnionBootstrap.createRuntime()
    val res = rt.router.route(HttpRequest("GET", "/health"))
    assert(res.status == 200)
    assert(res.body.get("status").contains("ok"))
    assert(res.body.get("system").contains("bank-wealth"))
    assert(res.body.get("context").contains("bankwealth"))
  }

  // @CoArisingSpec(id="INTERFACES_NOT_FOUND", witness="http-404")
  test("[INTERFACES_NOT_FOUND] GET /api/v1/__unknown__ -> 404 ROUTE_NOT_FOUND") {
    val rt = OnionBootstrap.createRuntime()
    val res = rt.router.route(HttpRequest("GET", "/api/v1/__unknown__"))
    assert(res.status == 404)
    assert(res.body.get("code").contains("ROUTE_NOT_FOUND"))
  }

  // @CoArisingSpec(id="INTERFACES_AUTH_401", witness="http-authority-401")
  test("[INTERFACES_AUTH_401] POST /api/v1/bankwealth/bank-cash-submit-port/submit without auth -> 401 NOT_AUTHENTICATED") {
    val denyAuth = new example.bankwealth.v2.interfaces.api.HttpAuthority {
      override def authenticate(req: HttpRequest) = None
      override def authorize(principal: example.bankwealth.v2.interfaces.api.Principal, route: example.bankwealth.v2.interfaces.api.RouteDescriptor) = false
    }
    val rt = OnionBootstrap.createRuntime(authority = denyAuth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-cash-submit-port/submit"))
    assert(res.status == 401)
    assert(res.body.get("code").contains("NOT_AUTHENTICATED"))
  }

  // @CoArisingSpec(id="INTERFACES_AUTH_403", witness="http-authority-403")
  test("[INTERFACES_AUTH_403] POST /api/v1/bankwealth/bank-cash-submit-port/submit forbidden role -> 403 NOT_AUTHORIZED") {
    val forbidAuth = new example.bankwealth.v2.interfaces.api.HttpAuthority {
      override def authenticate(req: HttpRequest) = Some(example.bankwealth.v2.interfaces.api.Principal("guest", Set("viewer")))
      override def authorize(principal: example.bankwealth.v2.interfaces.api.Principal, route: example.bankwealth.v2.interfaces.api.RouteDescriptor) = false
    }
    val rt = OnionBootstrap.createRuntime(authority = forbidAuth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-cash-submit-port/submit"))
    assert(res.status == 403)
    assert(res.body.get("code").contains("NOT_AUTHORIZED"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_401", witness="http-authz-401")
  test("[AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_401] POST /api/v1/bankwealth/bank-cash-submit-port/submit unauthenticated -> 401") {
    val auth = new RoleBasedAuthority(_ => None)
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-cash-submit-port/submit", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 401)
    assert(res.body.get("code").contains("NOT_AUTHENTICATED"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_403_ROLE", witness="http-authz-403-role")
  test("[AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_403_ROLE] POST /api/v1/bankwealth/bank-cash-submit-port/submit forbidden role -> 403") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("__forbidden_role__"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)))
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-cash-submit-port/submit", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 403)
    assert(res.body.get("code").contains("NOT_AUTHORIZED"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_ALLOW_ROLE", witness="http-authz-allow-role")
  test("[AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_ALLOW_ROLE] POST /api/v1/bankwealth/bank-cash-submit-port/submit allowed role investor passes PEP") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("investor"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)))
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-cash-submit-port/submit", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status != 401 && res.status != 403)
  }

  // @CoArisingSpec(id="AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_403_CSRF", witness="http-authz-csrf")
  test("[AUTHZ_BANK_CASH_SUBMIT_PORT_SUBMIT_403_CSRF] POST /api/v1/bankwealth/bank-cash-submit-port/submit invalid CSRF -> 403 CSRF_INVALID") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("investor"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)), csrfFn = _ => false)
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-cash-submit-port/submit", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 403)
    assert(res.body.get("code").contains("CSRF_INVALID"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_ORDER_QUERY_GET_401", witness="http-authz-401")
  test("[AUTHZ_BANK_ORDER_QUERY_GET_401] GET /api/v1/bankwealth/bank-order-query/get unauthenticated -> 401") {
    val auth = new RoleBasedAuthority(_ => None)
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("GET", "/api/v1/bankwealth/bank-order-query/get", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 401)
    assert(res.body.get("code").contains("NOT_AUTHENTICATED"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_ORDER_QUERY_GET_403_ROLE", witness="http-authz-403-role")
  test("[AUTHZ_BANK_ORDER_QUERY_GET_403_ROLE] GET /api/v1/bankwealth/bank-order-query/get forbidden role -> 403") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("__forbidden_role__"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)))
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("GET", "/api/v1/bankwealth/bank-order-query/get", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 403)
    assert(res.body.get("code").contains("NOT_AUTHORIZED"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_ORDER_QUERY_GET_ALLOW_ROLE", witness="http-authz-allow-role")
  test("[AUTHZ_BANK_ORDER_QUERY_GET_ALLOW_ROLE] GET /api/v1/bankwealth/bank-order-query/get allowed role investor passes PEP") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("investor"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)))
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("GET", "/api/v1/bankwealth/bank-order-query/get", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status != 401 && res.status != 403)
  }

  // @CoArisingSpec(id="AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_401", witness="http-authz-401")
  test("[AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_401] POST /api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome unauthenticated -> 401") {
    val auth = new RoleBasedAuthority(_ => None)
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 401)
    assert(res.body.get("code").contains("NOT_AUTHENTICATED"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_403_ROLE", witness="http-authz-403-role")
  test("[AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_403_ROLE] POST /api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome forbidden role -> 403") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("__forbidden_role__"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)))
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 403)
    assert(res.body.get("code").contains("NOT_AUTHORIZED"))
  }

  // @CoArisingSpec(id="AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_ALLOW_ROLE", witness="http-authz-allow-role")
  test("[AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_ALLOW_ROLE] POST /api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome allowed role ta-bridge-service passes PEP") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("ta-bridge-service"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)))
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status != 401 && res.status != 403)
  }

  // @CoArisingSpec(id="AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_403_CSRF", witness="http-authz-csrf")
  test("[AUTHZ_BANK_TA_BRIDGE_PORT_INGEST_OUTCOME_403_CSRF] POST /api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome invalid CSRF -> 403 CSRF_INVALID") {
    val auth = new RoleBasedAuthority(_ => Some(Principal("ok-user", Set("ta-bridge-service"), tenantId = Some("t-1"), attributes = Map.empty, entitlements = Set.empty)), csrfFn = _ => false)
    val rt = OnionBootstrap.createRuntime(authority = auth)
    val res = rt.router.route(HttpRequest("POST", "/api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome", body = Map.empty[String, Any], stateSnapshot = Map.empty[String, Any]))
    assert(res.status == 403)
    assert(res.body.get("code").contains("CSRF_INVALID"))
  }

  // @CoArisingSpec(id="HTTP_US-CFP-01", witness="interfaces-http-us-cfp-01")
  test("[HTTP_US-CFP-01] POST /api/v1/bankwealth/bank-cash-submit-port/submit -> HTTP 401") {
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = false
      override def originAndCsrfValid(): Boolean = false
      override def fundCodeActive(fundCode: Any): Boolean = false
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val rt = OnionBootstrap.createRuntime(cashFundPurchaseHandler = Some(CashFundPurchaseImpl), cashFundPurchaseExterns = Some(externs))
    val req = HttpRequest(method = "POST", path = "/api/v1/bankwealth/bank-cash-submit-port/submit", body = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "", "clientRequestId" -> ""), stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "", "amount" -> "0.00"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> "")))
    val res = rt.router.route(req)
    assert(res.status == 401)
    assert(res.body.get("ok").contains(false))
    assert(res.body.get("code").contains("UNAUTHORIZED_OR_CSRF"))
  }

  // @CoArisingSpec(id="HTTP_US-CFP-03", witness="interfaces-http-us-cfp-03")
  test("[HTTP_US-CFP-03] POST /api/v1/bankwealth/bank-cash-submit-port/submit -> HTTP 200") {
    val externs = new CashFundPurchaseExternPorts {
      override def sessionAuthenticated(principal: Any): Boolean = true
      override def originAndCsrfValid(): Boolean = true
      override def fundCodeActive(fundCode: Any): Boolean = true
      override def requestExists(principal: Any, clientRequestId: Any): Boolean = false
      override def payloadMatchesOriginal(principal: Any, clientRequestId: Any, fundCode: Any, amount: Any): Boolean = false
    }
    val rt = OnionBootstrap.createRuntime(cashFundPurchaseHandler = Some(CashFundPurchaseImpl), cashFundPurchaseExterns = Some(externs))
    val req = HttpRequest(method = "POST", path = "/api/v1/bankwealth/bank-cash-submit-port/submit", body = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> ""), "principal" -> "", "fundCode" -> "id_5", "clientRequestId" -> "CNY"), stateSnapshot = Map[String, Any]("amount" -> Map[String, Any]("currency" -> "CNY", "amount" -> "0.01"), "order" -> Map[String, Any]("paymentOutcome" -> "", "taStatus" -> "")))
    val res = rt.router.route(req)
    assert(res.status == 200)
    assert(res.body.get("ok").contains(true))
  }

  // @CoArisingSpec(id="HTTP_TA-BR-01", witness="interfaces-http-ta-br-01")
  test("[HTTP_TA-BR-01] POST /api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome -> HTTP 404") {
    val externs = new TaBridgeSettlementExternPorts {
      override def submissionPinned(orderId: Any): Boolean = false
      override def taReceiptAuthentic(orderId: Any): Boolean = false
      override def taOutcomeConfirmed(orderId: Any): Boolean = false
      override def taOutcomeRejected(orderId: Any): Boolean = false
      override def taAbsenceConfirmed(orderId: Any): Boolean = false
    }
    val rt = OnionBootstrap.createRuntime(taBridgeSettlementHandler = Some(TaBridgeSettlementImpl), taBridgeSettlementExterns = Some(externs))
    val req = HttpRequest(method = "POST", path = "/api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome", body = Map[String, Any]("orderId" -> ""), stateSnapshot = Map.empty[String, Any])
    val res = rt.router.route(req)
    assert(res.status == 404)
    assert(res.body.get("ok").contains(false))
    assert(res.body.get("code").contains("TA_UNKNOWN_ORIGINAL"))
  }

  // @CoArisingSpec(id="HTTP_TA-BR-03", witness="interfaces-http-ta-br-03")
  test("[HTTP_TA-BR-03] POST /api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome -> HTTP 200") {
    val externs = new TaBridgeSettlementExternPorts {
      override def submissionPinned(orderId: Any): Boolean = true
      override def taReceiptAuthentic(orderId: Any): Boolean = true
      override def taOutcomeConfirmed(orderId: Any): Boolean = true
      override def taOutcomeRejected(orderId: Any): Boolean = false
      override def taAbsenceConfirmed(orderId: Any): Boolean = false
    }
    val rt = OnionBootstrap.createRuntime(taBridgeSettlementHandler = Some(TaBridgeSettlementImpl), taBridgeSettlementExterns = Some(externs))
    val req = HttpRequest(method = "POST", path = "/api/v1/bankwealth/bank-ta-bridge-port/ingest-outcome", body = Map[String, Any]("orderId" -> ""), stateSnapshot = Map.empty[String, Any])
    val res = rt.router.route(req)
    assert(res.status == 200)
    assert(res.body.get("ok").contains(true))
  }

}
