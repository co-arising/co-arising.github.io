// Handwritten DI bindings isolation zone for example.bankwealth.v2.
// BootstrapModule automatically loads this module via installOptionalModule.
// GeneratedBindingsModule provides default bindings for Computations (L2 -> *Impl, L1-only -> Noop), ReadSide, ToolGates, Effects, *Impl handlers, and SagaCoordinatorBootstrap.
// Override or add custom infrastructure / DomainService bindings below; truthsrc generate-v2 will never overwrite this file.
package example.bankwealth.v2.modules

import com.google.inject.AbstractModule
import example.bankwealth.v2.infrastructure.bootstrap.BankwealthProjectionModule

final class HandwrittenBindingsModule extends AbstractModule {
  override def configure(): Unit = {
    install(new GeneratedBindingsModule())
    install(new BankwealthProjectionModule())
  }
}
