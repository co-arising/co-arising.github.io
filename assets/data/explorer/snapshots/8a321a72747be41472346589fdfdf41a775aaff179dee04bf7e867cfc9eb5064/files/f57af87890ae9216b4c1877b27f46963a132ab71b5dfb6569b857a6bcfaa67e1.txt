// Handwritten external ToolGate connector isolation zone for BankTaBridgePortConnectorPort (family #25).
// Replace default stub responses with real external client integrations; truthsrc generate-v2 will never overwrite this file.
// @knowledge source:bank-wealth/bankwealth#/externContracts/BankTaBridgePort
package example.bankwealth.v2.infrastructure.connectors

import example.bankwealth.v2.application.toolgates.BankTaBridgePortConnectorPort
import scala.concurrent.Future

final class BankTaBridgePortConnectorImpl extends BankTaBridgePortConnectorPort {
  override def submissionPinned(orderId: String): Future[Boolean] = Future.successful(true)
  override def taReceiptAuthentic(orderId: String): Future[Boolean] = Future.successful(true)
  override def taOutcomeConfirmed(orderId: String): Future[Boolean] = Future.successful(true)
  override def taOutcomeRejected(orderId: String): Future[Boolean] = Future.successful(true)
  override def taAbsenceConfirmed(orderId: String): Future[Boolean] = Future.successful(true)
}
