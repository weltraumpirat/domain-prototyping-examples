import {createWithdrawFundsCommandHandler} from './command-handlers'
import {
  AccountRepository,
  AccountRepositoryInMemory
} from './repository'
import {EventbusInMemory} from '../../components/eventbus-in-memory'
import {Eventbus} from '../../components/eventbus'
import {
  FundsWithdrawnEvent,
  WithdrawalRejectedEvent
} from './events'
import {
  DomainCommand,
  DomainEvent
} from '../../components/messages'
import {Account} from './types'
import {WithdrawFundsCommand} from './commands'
import {CommandHandler} from '../../components/message-handler'

describe('Account.withdrawFundsCommandHandler():', () => {
  let repository: AccountRepository
  let eventbus: Eventbus
  let result: DomainEvent
  let account: Account
  let handler: CommandHandler<DomainCommand>

  beforeEach(async () => {
    eventbus = new EventbusInMemory()
    repository = new AccountRepositoryInMemory()
    account = new Account()
    await repository.save(account)
    handler = createWithdrawFundsCommandHandler(repository, eventbus)

  })
  describe('when the account has sufficient funds', () => {
    beforeEach(async () => {
      account.deposit(10, 'EUR')
    })

    it('should withdraw money from Account', async () => {
      eventbus.subscribe(FundsWithdrawnEvent, async (evt: DomainEvent) => {
        result = evt
      })

      const command = new WithdrawFundsCommand(account.id, 10, 'EUR')
      await handler(command)

      expect(result).toEqual({
        id: expect.any(String),
        type: 'FUNDS_WITHDRAWN',
        account: account.id,
        amount: 10,
        currency: 'EUR',
        balanceBefore: 10,
        balanceAfter: 0,
      })
    })
  })
  describe('when the account does NOT have sufficient funds', () => {
    beforeEach(async () => {
      account.deposit(9, 'EUR')
    })

    it('should reject the transaction', async () => {
      eventbus.subscribe(WithdrawalRejectedEvent, async (evt: DomainEvent) => {
        result = evt
      })

      const command = new WithdrawFundsCommand(account.id, 10, 'EUR')
      await handler(command)

      expect(result).toEqual({
        id: expect.any(String),
        type: 'WITHDRAWAL_REJECTED',
        account: account.id,
        amount: 10,
        currency: 'EUR',
        balanceBefore: 9,
        reason: 'Insufficient funds.'
      })
    })
  })
})
