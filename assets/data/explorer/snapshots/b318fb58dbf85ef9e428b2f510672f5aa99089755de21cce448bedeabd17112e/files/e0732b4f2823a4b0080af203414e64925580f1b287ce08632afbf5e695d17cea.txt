package example.bankwealth.infrastructure.persistence

object BankReadsideSchema {
  val version: String = example.bankwealth.infrastructure.repositories.projection.BankJournalReadsideSchema.version
  val statements: Vector[String] = example.bankwealth.infrastructure.repositories.projection.BankJournalReadsideSchema.statements
}
