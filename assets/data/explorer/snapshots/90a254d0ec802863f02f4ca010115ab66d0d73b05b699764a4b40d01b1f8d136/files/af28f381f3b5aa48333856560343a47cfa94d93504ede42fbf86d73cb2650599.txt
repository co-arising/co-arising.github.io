package example.bankwealth.modules

import com.google.inject.{AbstractModule, Provides}
import example.bankwealth.application.aggregates.FundOrderProtocol
import example.bankwealth.application.readmodels.bank_journal.BankJournalReadsideProjectionHandler
import example.bankwealth.application.readmodels.bank_journal.repository.BankJournalReadsideRepository
import example.bankwealth.domain.services.{CreditBalanceComputations, FundOrderComputations, SipPlanComputations}
import example.bankwealth.domain.services.impl.{BankBalanceComputations, StableOrderIdentity, StableSipIdentity}
import example.bankwealth.infrastructure.bootstrap.BankServiceFactory
import example.bankwealth.infrastructure.persistence.{BankJdbcDataSource, BankReadside}
import example.bankwealth.infrastructure.repositories.projection.BankJournalReadsideRepositoryImpl
import javax.inject.Singleton
import javax.sql.DataSource
import play.api.Configuration

/** Guice bindings for handwritten isolation-zone domain service and readside port implementations.
  * Automatically discovered and installed by generated `BootstrapModule`.
  */
final class HandwrittenBindingsModule extends AbstractModule {
  override def configure(): Unit = {
    bind(classOf[CreditBalanceComputations]).toInstance(BankBalanceComputations)
    bind(classOf[FundOrderComputations]).toInstance(StableOrderIdentity)
    bind(classOf[SipPlanComputations]).toInstance(StableSipIdentity)
    bind(classOf[FundOrderProtocol.ExternalAuthority]).toInstance(
      new FundOrderProtocol.ExternalAuthority {
        override def authorize(producer: String, authorization: String, identity: Vector[String]): Boolean = false
      }
    )
  }

  @Provides
  @Singleton
  def provideDataSource(configuration: Configuration): DataSource =
    new BankJdbcDataSource(
      configuration.get[String]("db.default.url"),
      configuration.get[String]("db.default.username"),
      configuration.get[String]("db.default.password")
    )

  @Provides
  @Singleton
  def provideBankJournalReadsideRepository(
    configuration: Configuration,
    dataSource: DataSource
  ): BankJournalReadsideRepository =
    new BankJournalReadsideRepositoryImpl(
      configuration.get[String]("bank.namespace"),
      dataSource
    )

  @Provides
  @Singleton
  def provideBankJournalReadsideBindings(
    configuration: Configuration
  ): BankJournalReadsideProjectionHandler.Bindings =
    BankReadside.createBindings(
      configuration.get[String]("bank.namespace"),
      BankServiceFactory.loadDemoConfiguration(configuration)
    )
}
