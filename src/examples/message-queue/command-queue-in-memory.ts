import {CommandQueue} from '../../components/message-queue'
import {Eventbus} from '../../components/eventbus'
import {CommandQueueInMemory} from '../../components/message-queue-in-memory'
import {createWithdrawFundsCommandHandler} from '../../domain/account/command-handlers'
import {WithdrawFundsCommand} from '../../domain/account/commands'
import {AccountRepository} from '../../domain/account/repository'

// ----- Infrastructure setup

declare const eventbus: Eventbus
declare const repository: AccountRepository
const accountCommandQueue: CommandQueue = new CommandQueueInMemory()

// ----- Wiring things together

const commandHandler = createWithdrawFundsCommandHandler(repository, eventbus)
const consumer = async (): Promise<void> => {
  await accountCommandQueue.consume(commandHandler)
  setTimeout(consumer, 100)
}

// No batching, single consumer
setTimeout(consumer, 100)

// somewhere else (producer)
const command = new WithdrawFundsCommand('0001', 10, 'EUR')
// noinspection JSIgnoredPromiseFromCall
accountCommandQueue.add( command )
