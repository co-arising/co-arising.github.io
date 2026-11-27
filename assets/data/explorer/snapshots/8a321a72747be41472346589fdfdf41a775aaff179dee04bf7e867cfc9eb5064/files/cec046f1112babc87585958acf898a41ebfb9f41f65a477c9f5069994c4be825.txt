// Handwritten S1 side-effect adapter isolation zone for TaBridgeSettlementEffectFace.Port (protocol: three-phase-reconcile).
// Replace default stub responses with real external gateway/reconcile calls; truthsrc generate-v2 will never overwrite this file.
// @knowledge source:bank-wealth/bankwealth#/effects/TaBridgeSettlement
package example.bankwealth.v2.infrastructure.effects

import example.bankwealth.v2.application.process.TaBridgeSettlementEffectFace
import example.bankwealth.v2.application.process.TaBridgeSettlementEffectFace.{EffectEvent, EffectRequested}
import scala.concurrent.Future

final class TaBridgeSettlementEffectPortImpl extends TaBridgeSettlementEffectFace.Port {
  override def pin(idempotencyKey: String, payload: Map[String, Any]): Future[EffectEvent] = Future.successful(EffectRequested(idempotencyKey, "pin"))
  override def dispatch(idempotencyKey: String, payload: Map[String, Any]): Future[EffectEvent] = Future.successful(EffectRequested(idempotencyKey, "dispatch"))
  override def reconcile(idempotencyKey: String, payload: Map[String, Any]): Future[EffectEvent] = Future.successful(EffectRequested(idempotencyKey, "reconcile"))
}
