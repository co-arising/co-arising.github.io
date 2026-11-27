// Handwritten readside business-semantics isolation zone for BankOrderView (family #26).
// Bound by BankwealthProjectionModule; truthsrc generate-v2 will never overwrite this file.
package example.bankwealth.v2.infrastructure.projection

import example.bankwealth.v2.application.projection.handlers.BankOrderApplyEventSemantics
import example.bankwealth.v2.application.projection.repository.BankOrderTable.BankOrderView

final class BankOrderApplyEventSemanticsImpl extends BankOrderApplyEventSemantics {
  override def emptyRow: BankOrderView = BankOrderView()
}
