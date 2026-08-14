import {randomUUID} from 'node:crypto'
import {
  DomainCommand,
  DomainEvent
} from '../components/messages'
import {
  AccountNumber,
  AccountUsageType,
  Amount,
  Currency,
  UUID
} from './types'
import {Eventbus} from '../components/eventbus'

export interface TransactionOutcome {
  balanceBefore: Amount
  balanceAfter: Amount
}

export interface TransactionRejection {
  balanceBefore: Amount
  reason: string
}

export type TransactionResult = TransactionOutcome | TransactionRejection

// We skip the implementation of the Account interface for brevity
export declare interface Account {
  deposit(amount: Amount, currency: Currency): TransactionResult

  withdraw(amount: Amount, currency: Currency): TransactionResult

  transfer(amount: Amount, currency: Currency, targetAccount: AccountNumber): TransactionResult
}

export class WithdrawFundsCommand extends DomainCommand<'WITHDRAW_FUNDS'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'WITHDRAW_FUNDS' as const
  override readonly type = WithdrawFundsCommand.type

  constructor(readonly account: AccountNumber, readonly amount: Amount, readonly currency: Currency) {
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

export class CollectBonusPointsCommand extends DomainCommand<'COLLECT_BONUS_POINTS'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'COLLECT_BONUS_POINTS' as const
  readonly type = CollectBonusPointsCommand.type

  constructor(readonly account: AccountNumber, readonly usageType: AccountUsageType, readonly amount: Amount, readonly currency: Currency) {
    super()
  }
}

export class SendEmailNotificationCommand extends DomainCommand<'SEND_EMAIL_NOTIFICATION'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'SEND_EMAIL_NOTIFICATION' as const
  readonly type = SendEmailNotificationCommand.type

  constructor(readonly account: AccountNumber, readonly subject: string, readonly body: string) {
    super()
  }
}

export declare interface AccountRepository {
  getById(id: UUID): Promise<Account>
}

// Injecting dependencies here, returns the handler function
export const createWithdrawalCommandHandler = (repository: AccountRepository, eventbus: Eventbus) =>
    async (cmd: DomainCommand): Promise<void> => {
      const command = cmd as WithdrawFundsCommand
      // throws NotFoundException -- is that an unexpected error?
      const account = await repository.getById(command.account)
      const result = account.withdraw(command.amount, command.currency)
      if (!('reason' in result)) {
        const event = new FundsWithdrawnEvent(
            command.account,
            command.amount,
            command.currency,
            result.balanceBefore,
            result.balanceAfter,
        )
        await eventbus.publish(event)
      } else {
        const event = new WithdrawalRejectedEvent(
            command.account,
            command.amount,
            command.currency,
            result.balanceBefore,
            result.reason
        )
        await eventbus.publish(event)
      }
    }
