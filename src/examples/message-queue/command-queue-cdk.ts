import { Duration } from 'aws-cdk-lib'
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway'
import { ITable } from 'aws-cdk-lib/aws-dynamodb'
import { IEventBus } from 'aws-cdk-lib/aws-events'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import {
  DeduplicationScope,
  FifoThroughputLimit,
  Queue
} from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

// The bus and the table exist elsewhere in the infrastructure.
// noinspection JSUnusedGlobalSymbols
export function wireAccountCommandQueue(
    scope: Construct,
    bus: IEventBus,
    table: ITable
) {
  // See DeadLetterQueue(SQS) for info on dead letter queues.
  const deadLetterQueue = new Queue(scope, 'AccountCommandDLQ', {
    fifo: true,
    retentionPeriod: Duration.days(14)
  })

  const commandQueue = new Queue(scope, 'AccountCommandQueue', {
    fifo: true,
    // Enable deduplication by body hash
    contentBasedDeduplication: true,
    // Order by message group ID
    deduplicationScope: DeduplicationScope.MESSAGE_GROUP,
    fifoThroughputLimit: FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
    visibilityTimeout: Duration.minutes(3),
    retentionPeriod: Duration.days(14),
    // After five deliveries the message moves to the DLQ, the rest of its group can proceed
    deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 5 }
  })

  // This is our REST API Lambda
  const withdrawFundsApi =
      new NodejsFunction(scope, 'WithdrawFundsApi', {
        entry: 'src/accounts/withdraw-funds-api.ts',
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(10),
        environment: {
          QUEUE_URL: commandQueue.queueUrl
        }
      })

  // The HTTP entry point that triggers the lambda
  new LambdaRestApi(scope, 'AccountApi', { handler: withdrawFundsApi })
  commandQueue.grantSendMessages(withdrawFundsApi)

  // The Command Handler Lambda
  const accountCommandHandlers =
      new NodejsFunction(scope, 'AccountCommandHandlers', {
        entry: 'src/accounts/command-handler.ts',
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(30),
        environment: {
          EVENT_BUS_NAME: bus.eventBusName,
          TABLE_NAME: table.tableName
        }
      })

  // The queue is the event source: SQS invokes the Lambda, reportBatchItemFailures enables
  // SQSBatchResponses to report errors.
  accountCommandHandlers.addEventSource(new SqsEventSource(commandQueue, {
    batchSize: 10,
    reportBatchItemFailures: true
  }))

  // The handler publishes its result events and reads and writes the account
  // it changes
  bus.grantPutEventsTo(accountCommandHandlers)
  table.grantReadWriteData(accountCommandHandlers)
}
