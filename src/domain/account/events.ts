// noinspection JSUnusedGlobalSymbols

import {DomainEvent} from '../../components/messages'
import {
  AccountNumber,
  Amount,
  Currency,
  UUID
} from '../types'
import {randomUUID} from 'node:crypto'

export class WithdrawalRejectedEvent extends DomainEvent<'WITHDRAWAL_REJECTED'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'WITHDRAWAL_REJECTED' as const
  readonly type = WithdrawalRejectedEvent.type

  constructor(
      readonly account: AccountNumber,
      readonly amount: Amount,
      readonly currency: Currency,
      readonly balanceBefore: Amount,
      readonly reason: string
  ) {
    super()
  }
}

export class FundsWithdrawnEvent extends DomainEvent<'FUNDS_WITHDRAWN'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'FUNDS_WITHDRAWN' as const
  override readonly type = FundsWithdrawnEvent.type

  constructor(
      readonly account: AccountNumber,
      readonly amount: Amount,
      readonly currency: Currency,
      readonly balanceBefore: Amount,
      readonly balanceAfter: Amount
  ) {
    super()
  }
}
