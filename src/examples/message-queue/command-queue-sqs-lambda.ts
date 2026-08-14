import {Eventbus} from '../../components/eventbus'
import {MessageHandler} from '../../components/message-handler'
import {CommandQueueSQS} from '../../components/message-queue-sqs'
import {DomainCommand} from '../../components/messages'
import {createCommandSqsLambdaHandler} from '../../components/lambda-handlers'
import {
  AccountRepository,
  createWithdrawalCommandHandler
} from '../../domain/account'


// Dependencies initialized with their AWS-specific versions.
declare const repository: AccountRepository
declare const eventbus: Eventbus

// Not add()ing to this queue, so not passing SQS properties
const queue = new CommandQueueSQS()

// The withdrawal logic is the same one from our in-memory example, unchanged.
const withdrawalCommandHandler: MessageHandler<DomainCommand> = createWithdrawalCommandHandler(repository, eventbus)

export const handler = createCommandSqsLambdaHandler(queue, withdrawalCommandHandler)
// noinspection JSUnusedGlobalSymbols
export default handler
