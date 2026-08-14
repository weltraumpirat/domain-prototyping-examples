import {SQSClient} from '@aws-sdk/client-sqs'
import {
  CommandQueueSQS,
  EventQueueSQS
} from '../../components/message-queue-sqs'
import {
  WithdrawalPolicyHandlers
} from './event-queue-in-memory'
import {
  CollectBonusPointsCommand,
  SendEmailNotificationCommand
} from '../../domain/account'
import {createPolicySqsLambdaHandler} from '../../components/lambda-handlers'

// Not adding to this queue, so no SQS configuration
const eventQueue = new EventQueueSQS()

const sqs = new SQSClient({})

// These are the queues that will receive a command
const bonusPointsQueueUrl = process.env.BONUS_POINTS_QUEUE_URL!
const bonusPointsQueue = new CommandQueueSQS<CollectBonusPointsCommand>({
  sqs,
  messageGroupProperty: 'account',
  queueUrl: bonusPointsQueueUrl
})

const sendNotificationQueueUrl = process.env.SEND_NOTIFICATION_QUEUE_URL!
const sendNotificationQueue = new CommandQueueSQS<SendEmailNotificationCommand>({
  sqs,
  messageGroupProperty: 'account',
  queueUrl: sendNotificationQueueUrl
})
const policyHandlers = new WithdrawalPolicyHandlers(bonusPointsQueue, sendNotificationQueue)

export const handler =
    createPolicySqsLambdaHandler(eventQueue, policyHandlers.handle.bind(policyHandlers))

// noinspection JSUnusedGlobalSymbols
export default handler
