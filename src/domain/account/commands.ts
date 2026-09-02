import {DomainCommand} from '../../components/messages'
import {
  AccountNumber,
  Amount,
  Currency,
  UUID
} from '../types'
import {randomUUID} from 'node:crypto'

export class WithdrawFundsCommand extends DomainCommand<'WITHDRAW_FUNDS'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'WITHDRAW_FUNDS' as const
  override readonly type = WithdrawFundsCommand.type

  constructor(readonly account: AccountNumber, readonly amount: Amount, readonly currency: Currency) {
    super()
  }
}
