package example.bankwealth.infrastructure.security

import example.bankwealth.infrastructure.bootstrap.BankActorHandle
import example.bankwealth.infrastructure.persistence.BankJournal
import akka.actor.typed.{ActorRef, ActorSystem}
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
import example.bankwealth.application.aggregates.CreditBalanceProtocol
import example.bankwealth.infrastructure.proto.CreditBalanceEventPO
import example.bankwealth.infrastructure.persistence.converters.DomainConverters
import example.bankwealth.infrastructure.security.BankSeed
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._

final class BankSeedAuthority(journal: BankJournal)(implicit system: ActorSystem[_]) {
  implicit private val ec: ExecutionContext = system.executionContext
  implicit private val timeout: Timeout = Timeout(3.seconds)

  def ensure(seed: BankSeed, account: BankActorHandle[CreditBalanceProtocol.Command]): Future[Unit] = {
    def initialized(): Future[Boolean] = journal.readPb(account.persistenceId).map { events =>
      val originals = events.collect { case e: CreditBalanceEventPO if e.event.isAccountInitialized => DomainConverters.decodeAccountInitializedPO(e.event.accountInitialized.get) }
      require(originals.size <= 1, "multiple account initialization facts")
      originals.headOption.foreach { original =>
        require(original.resource == seed.accountId && original.currency == seed.currency && original.amount == seed.amount, "trusted seed conflicts with original initialization")
      }
      originals.nonEmpty
    }
    initialized().flatMap {
      case true => Future.successful(())
      case false =>
        account.ref.ask[CreditBalanceProtocol.Reply](CreditBalanceProtocol.InitializeAccount(seed.accountId, seed.currency, seed.amount, _))
          .transformWith { _ => initialized().map(exists => require(exists, "account initialization has no durable original fact")) }
    }
  }
}
