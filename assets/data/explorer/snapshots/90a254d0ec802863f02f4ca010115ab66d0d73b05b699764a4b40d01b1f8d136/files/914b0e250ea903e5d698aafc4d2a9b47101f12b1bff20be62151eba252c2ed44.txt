package example.bankwealth.infrastructure.persistence

import scala.util.control.NonFatal

private[bankwealth] object BankResourceCleanup {
  def closeAll(resources: Iterable[AutoCloseable]): Unit = {
    var failure = Option.empty[Throwable]
    resources.foreach { resource =>
      try resource.close()
      catch {
        case NonFatal(error) => failure match {
          case None => failure = Some(error)
          case Some(first) if first ne error => first.addSuppressed(error)
          case _ => ()
        }
      }
    }
    failure.foreach(throw _)
  }
}
