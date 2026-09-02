import { Handler, SQSEvent } from 'aws-lambda'
import {Eventbus} from '../../components/eventbus'
import {CommandQueueSQS} from '../../components/message-queue-sqs'
import {createCommandSqsLambdaHandler} from '../../components/lambda-handlers'

import {ShoppingCartRepository} from '../../domain/shopping-cart/repository'
import {ShoppingCartCommandHandlersQueue} from '../../domain/shopping-cart/command-handlers'

// Dependencies initialized with AWS-specific versions
declare const commandQueue: CommandQueueSQS
declare const repository: ShoppingCartRepository
declare const eventbus: Eventbus

// Here we configure what to actually do with incoming commands
const shoppingCartCommandHandlers =
    new ShoppingCartCommandHandlersQueue(repository, eventbus)

// Wrap the command handlers in a lambda handler
export const handler: Handler<SQSEvent> =
    createCommandSqsLambdaHandler(commandQueue, shoppingCartCommandHandlers.handle.bind(shoppingCartCommandHandlers))

// noinspection JSUnusedGlobalSymbols
export default handler
