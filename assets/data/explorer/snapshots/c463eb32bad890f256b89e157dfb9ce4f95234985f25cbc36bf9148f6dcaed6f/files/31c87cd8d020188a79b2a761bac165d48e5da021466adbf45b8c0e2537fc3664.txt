package example.bankwealth.infrastructure.bootstrap

import example.bankwealth.application.process.sip.BankSipApplication
import example.bankwealth.application.process.ta.BankTaRefundApplication
import example.bankwealth.application.services.{BankCashRequests, BankPersistenceIds, BankTrustedAdmission}
import example.bankwealth.infrastructure.clock.BankBusinessClock
import example.bankwealth.infrastructure.connectors.{BankTaEffectBindings, MockTAClient}
import example.bankwealth.infrastructure.persistence.{BankJdbcDataSource, BankPersistenceJournal, BankReadside, BankResourceCleanup}
import example.bankwealth.infrastructure.recovery.{BankRecovery, BankRecoveryLoop}
import example.bankwealth.infrastructure.security.{BankDemoAuthority, BankDemoConfiguration, BankDemoPrincipal, BankFund, BankSeed, BankSeedAuthority}
import example.bankwealth.interfaces.web.{BankBrowserPages, BankServiceEndpoints}
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.contrib.persistence.mongodb.{MongoReadJournal, ScalaDslMongoReadJournal}
import akka.persistence.query.PersistenceQuery
import akka.stream.SystemMaterializer
import akka.stream.scaladsl.Sink
import example.bankwealth.domain.entities.SipPlanEntity
import example.bankwealth.interfaces.api.ApiAcknowledgements._
import example.bankwealth.interfaces.api.ApiCommands._
import example.bankwealth.interfaces.api.ApiKeys._
import example.bankwealth.interfaces.api.ApiResponses._
import example.bankwealth.interfaces.api.ApiWire._
import example.bankwealth.application.readmodels.ReadModelViews._
import example.bankwealth.application.process.protocol._
import example.bankwealth.application.process.protocol.BankPaymentMessages._
import example.bankwealth.application.process.protocol.BankRefundMessages._
import example.bankwealth.application.connectors._
import example.bankwealth.application.connectors.BankSipDispatchProtocol._
import example.bankwealth.application.connectors.BankTaEffectProtocol._
import example.bankwealth.domain.values._
import example.bankwealth.infrastructure.proto.SipPlanEventPO
import example.bankwealth.infrastructure.persistence.converters.DomainConverters
import example.bankwealth.infrastructure.persistence.BankReadside
import example.bankwealth.infrastructure.bootstrap.{BankServiceConfiguration, BankServiceContract => BankServiceService}
import example.bankwealth.application.process.sip.BankSipApplication
import example.bankwealth.application.process.ta.BankTaRefundApplication
import net.imadz.infra.saga.strict.{ReconcileAuthorizer, TransactionIdentity}
import play.api.ApplicationLoader
import java.nio.file.Paths
import java.util.concurrent.Executors
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration._
import scala.util.control.NonFatal

object BankServiceFactory {
  def loadDemoConfiguration(configuration: play.api.Configuration): BankDemoConfiguration = {
    require(configuration.get[String]("bank.demo.authMode") == "fixed-local-demo", "explicit demo authentication mode required")
    BankDemoConfiguration(
      configuration.get[String]("bank.demo.version"),
      configuration.get[String]("bank.demo.origin"),
      configuration.get[Seq[play.api.Configuration]]("bank.demo.principals").map { p =>
        BankDemoPrincipal(p.get[String]("id"), AccountId(p.get[String]("accountId")), p.get[Seq[String]]("roles").toSet,
          p.get[String]("token"), p.get[String]("csrfToken"))
      }.toVector,
      configuration.get[Seq[play.api.Configuration]]("bank.demo.funds").map { f =>
        BankFund(f.get[String]("code"), AccountId(f.get[String]("collectionAccountId")))
      }.toVector,
      configuration.get[Seq[play.api.Configuration]]("bank.demo.seeds").map { s =>
        val amount = DomainConverters.MoneyFromWire(MoneyWire(s.get[String]("minorUnits"), "CNY"))
        BankSeed(AccountId(s.get[String]("accountId")), "CNY", amount)
      }.toVector
    )
  }
}

final class BankServiceFactory extends BankServiceService.Factory {
  val implementation = "example.bankwealth.infrastructure.bootstrap.BankServiceFactory"
  val version = "bank-v1-service-1"

  def create(context: ApplicationLoader.Context): BankServiceService.Composition = {
    val configuration = context.initialConfiguration
    BankServiceConfiguration.validate(configuration)
    val authorityConfig = BankServiceFactory.loadDemoConfiguration(configuration)
    val namespace = configuration.get[String]("bank.namespace")
    val workerConfig = MockTAClient.Configuration(Paths.get(configuration.get[String]("bank.mockTa.node")),
      Paths.get(configuration.get[String]("bank.mockTa.worker")), Paths.get(configuration.get[String]("bank.mockTa.ownedRoot")))
    val workerJournal = Paths.get(configuration.get[String]("bank.mockTa.journal"))
    val workerTranscript = Paths.get(configuration.get[String]("bank.mockTa.transcript"))
    val workerStderr = Paths.get(configuration.get[String]("bank.mockTa.stderr"))
    val scenario = configuration.get[String]("bank.mockTa.scenario")
    require(Set("confirmed", "rejected", "unknown", "accepted", "delayed", "duplicate-identical", "duplicate-conflicting")(scenario), "trusted supported TA scenario required")
    val machineAuthorization = configuration.get[String]("bank.recovery.authorization")
    require(machineAuthorization.nonEmpty, "explicit machine recovery authorization required")
    val resources = scala.collection.mutable.ArrayBuffer.empty[AutoCloseable]
    try {
      val classic = akka.actor.ActorSystem("bank-" + namespace, configuration.underlying)
      resources += new AutoCloseable { def close(): Unit = { Await.result(classic.terminate(), 20.seconds); () } }
      implicit val system: ActorSystem[_] = classic.toTyped
      implicit val ec: ExecutionContext = system.executionContext
      implicit val materializer: akka.stream.Materializer = SystemMaterializer(system).materializer
      val query = PersistenceQuery(classic).readJournalFor[ScalaDslMongoReadJournal](MongoReadJournal.Identifier)
      val ids = new BankPersistenceIds(namespace)
      val journal = new BankPersistenceJournal(namespace, query, () => query.currentAllEvents().map(_.persistenceId).filter(ids.owns).statefulMapConcat { () =>
        var seen = Set.empty[String]
        id => if (seen(id)) Nil else { seen += id; List(id) }
      })
      resources += journal
      val client = new MockTAClient(workerConfig, workerJournal, workerTranscript, workerStderr)
      resources += client
      val admission = new BankTrustedAdmission(authorityConfig)
      val authorizer = new ReconcileAuthorizer {
        def authorize(id: TransactionIdentity, token: String): Either[String, String] =
          if (token == machineAuthorization) Right("bank-demo-machine-v1") else Left("not authorized")
      }
      val runtime = new BankRuntime(namespace, journal, authorizer, BankTaEffectBindings.forOrders(client, _ => scenario))
      resources += runtime
      val seeds = new BankSeedAuthority(journal)
      val seeded = authorityConfig.seeds.foldLeft(Future.successful(())) { (previous, seed) =>
        previous.flatMap(_ => runtime.account(seed.accountId).flatMap(handle => seeds.ensure(seed, handle)))
      }
      Await.result(seeded, 30.seconds)
      val cash = new BankCashRequests(runtime, authorityConfig, admission, journal)
      val sip = new BankSipApplication(runtime, journal, authorityConfig, admission)
      resources += sip
      val terminal: FundOrderId => Future[Unit] = orderId => journal.persistenceIds().filter(_.startsWith(ids.prefix + "plan/")).runWith(Sink.seq).flatMap { pids =>
        Future.traverse(pids)(journal.readPb(_)).flatMap { rows =>
          val occurrences = rows.flatten.collect { case p: SipPlanEventPO => DomainConverters.decodeSipPlanEventPO(p) }.collect { case e: SipPlanEntity.SipInstallmentTriggered => e.occurrence }.filter(_.fundOrderId == orderId).distinct
          Future.traverse(occurrences)(o => sip.recordTerminal(o).map(result => require(result.isRight, "terminal bridge remains pending"))).map(_ => ())
        }
      }
      val ta = new BankTaRefundApplication(runtime, journal, client, _ => scenario, terminal, authorityConfig, admission)
      resources += ta
      val jdbcExecutor = Executors.newFixedThreadPool(2)
      resources.prepend(new AutoCloseable { def close(): Unit = { jdbcExecutor.shutdown(); jdbcExecutor.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS); () } })
      val dataSource = new BankJdbcDataSource(configuration.get[String]("db.default.url"), configuration.get[String]("db.default.username"), configuration.get[String]("db.default.password"))
      val readside = new BankReadside(journal, authorityConfig, dataSource)(system, ExecutionContext.fromExecutor(jdbcExecutor))
      resources += readside
      val recovery = new BankRecovery(runtime, journal, authorityConfig, cash, machineAuthorization)
      val loop = new BankRecoveryLoop(journal, cash, ta, sip, recovery)
      resources += loop
      new BankServiceService.Composition {
        val authority = new BankDemoAuthority(authorityConfig)
        override val pages = Some(example.bankwealth.interfaces.web.BankBrowserPages)
        val bindings = BankServiceEndpoints.build(cash, readside, new BankBusinessClock(sip, client), recovery)
        val ready: Future[Unit] = readside.start().flatMap(_ => loop.start())
        private val stopped = new java.util.concurrent.atomic.AtomicBoolean(false)
        def close(): Unit = if (stopped.compareAndSet(false, true)) BankResourceCleanup.closeAll(resources.reverse.toVector)
      }
    } catch {
      case NonFatal(error) =>
        resources.reverseIterator.foreach { resource => try resource.close() catch { case NonFatal(cleanup) => error.addSuppressed(cleanup) } }
        throw error
    }
  }
}
