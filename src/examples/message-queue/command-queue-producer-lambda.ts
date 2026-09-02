import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { SQSClient } from '@aws-sdk/client-sqs'
import {
  CommandQueueSQS,
  SQSConfiguration
} from '../../components/message-queue-sqs'

import {WithdrawFundsCommand} from '../../domain/account/commands'


// Environment variable of the lambda, set by CDK.
// Will resolve at runtime.
const queueUrl = process.env.QUEUE_URL!

const sqs = new SQSClient({})
const sqsConfig: SQSConfiguration<WithdrawFundsCommand> = {sqs, messageGroupProperty: 'account', queueUrl: queueUrl}
const queue = new CommandQueueSQS(sqsConfig)

// Invoked by an API Gateway request.
export const handler: APIGatewayProxyHandler =
    async (request): Promise<APIGatewayProxyResult> => {
      const { account, amount, currency } = JSON.parse(request.body ?? '{}')
      const command = new WithdrawFundsCommand(account, amount, currency)
      await queue.add(command)

      // Request was accepted, command was sent. The outcome
      // arrives later, as an event — we'll have to GET that separately.
      return {
        statusCode: 202,
        body: JSON.stringify({ commandId: command.id })
      }
    }

// noinspection JSUnusedGlobalSymbols
export default handler
