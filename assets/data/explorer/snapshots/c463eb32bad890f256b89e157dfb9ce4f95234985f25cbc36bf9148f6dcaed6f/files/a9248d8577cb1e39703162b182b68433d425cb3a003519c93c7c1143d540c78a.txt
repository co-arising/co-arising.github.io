package example.bankwealth.domain.services.impl

import example.bankwealth.domain.entities.CreditBalanceEntity
import example.bankwealth.domain.invariants.params.CreditBalanceRuleParams._
import example.bankwealth.domain.services.CreditBalanceComputations
import example.bankwealth.domain.values.Money
import net.imadz.common.CommonTypes.iMadzError

object BankBalanceComputations extends CreditBalanceComputations {
  private def available(state: CreditBalanceEntity.State, currency: String): Either[iMadzError, Money] =
    state.accountBalance
      .get(currency)
      .toRight(iMadzError("LEDGER_CURRENCY_UNINITIALIZED", "initialized currency balance required"))

  def balanceAfterReserveFunds(state: CreditBalanceEntity.State, p: ReserveFundsParams): Either[iMadzError, Money] =
    available(state, p.amount.currency).flatMap(_.minus(p.amount))

  def balanceAfterCommitIncomingCredits(state: CreditBalanceEntity.State, p: CommitIncomingCreditsParams): Either[iMadzError, Money] =
    available(state, p.amount.currency).flatMap(_.plus(p.amount))

  def balanceAfterReleaseReservedFunds(state: CreditBalanceEntity.State, p: ReleaseReservedFundsParams): Either[iMadzError, Money] =
    available(state, p.amount.currency).flatMap { bal =>
      state.reservedAmount.get(p.txid) match {
        case Some(reserved) => bal.plus(reserved)
        case None => Right(bal)
      }
    }
}
