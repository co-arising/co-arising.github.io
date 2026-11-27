// Handwritten server-side trusted snapshot loader isolation zone for Play controllers.
// Query aggregate/read-model repositories here based on `operation`, bound `payload`, and `principal`.
// truthsrc generate-v2 will NEVER overwrite this file once created.
package example.bankwealth.v2.infrastructure.api

import javax.inject.{Inject, Singleton}
import scala.concurrent.Future

@Singleton
final class ServerSnapshotProviderImpl @Inject()() extends ServerSnapshotProvider {
  override def load(operation: String, payload: Map[String, Any], principal: Option[Map[String, Any]]): Future[Map[String, Any]] =
    Future.successful(Map.empty)
}
