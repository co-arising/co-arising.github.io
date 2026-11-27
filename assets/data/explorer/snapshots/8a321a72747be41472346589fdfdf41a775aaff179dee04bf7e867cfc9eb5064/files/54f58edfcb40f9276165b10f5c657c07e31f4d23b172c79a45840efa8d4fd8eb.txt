// Handwritten external ToolGate connector isolation zone for BankCashSubmitPortConnectorPort (family #25).
// Replace default stub responses with real external client integrations; truthsrc generate-v2 will never overwrite this file.
// @knowledge source:bank-wealth/bankwealth#/externContracts/BankCashSubmitPort
package example.bankwealth.v2.infrastructure.connectors

import example.bankwealth.v2.application.toolgates.BankCashSubmitPortConnectorPort
import scala.concurrent.Future

final class BankCashSubmitPortConnectorImpl extends BankCashSubmitPortConnectorPort {
  override def sessionAuthenticated(principal: String): Future[Boolean] = Future.successful(true)
  override def originAndCsrfValid(): Future[Boolean] = Future.successful(true)
  override def fundCodeActive(fundCode: String): Future[Boolean] = Future.successful(true)
  override def requestExists(principal: String, clientRequestId: String): Future[Boolean] = Future.successful(false)
  override def payloadMatchesOriginal(principal: String, clientRequestId: String, fundCode: String, amount: String): Future[Boolean] = Future.successful(true)
}
