// Injecting dependencies here returns the handler function
import {Eventbus} from '../../components/eventbus'
import {DomainCommand} from '../../components/messages'
import {WithdrawFundsCommand} from './commands'
import {AccountRepository} from './repository'
import {
  FundsWithdrawnEvent,
  WithdrawalRejectedEvent
} from './events'

export const createWithdrawFundsCommandHandler = (repository: AccountRepository, eventbus: Eventbus) =>
    async (cmd: DomainCommand): Promise<void> => {
      const command = cmd as WithdrawFundsCommand
      // throws NotFoundException -- is that an unexpected error?
      const account = await repository.getById(command.account)
      const result = account.withdrawFunds(command.amount, command.currency)
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
