import { Duration } from 'aws-cdk-lib'
import { ITable } from 'aws-cdk-lib/aws-dynamodb'
import { IEventBus } from 'aws-cdk-lib/aws-events'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { DeduplicationScope, FifoThroughputLimit, Queue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

// The bus and the table already exist elsewhere in the infrastructure. Here
// we only add the command side, and the permissions our handler Lambda needs.
// noinspection JSUnusedGlobalSymbols
export function wireShoppingCartCommandHandler(
  scope: Construct,
  bus: IEventBus,
  table: ITable
) {
  // FIFO, because commands addressed to the same cart must be applied in the
  // order they were sent. Visibility timeout has to outlast the Lambda,
  // or SQS re-delivers a command that is still being processed.
  const commandQueue = new Queue(scope, 'ShoppingCartCommandQueue', {
    fifo: true,
    // Deduplication by body hash: no sender has to invent an id, and a
    // command re-sent inside the five-minute window is dropped instead of
    // applied twice.
    contentBasedDeduplication: true,
    // Order per message group, not per queue — a cart waits for itself,
    // never for another cart. AWS grants that only for both settings
    // together; either one alone leaves the queue on normal throughput.
    deduplicationScope: DeduplicationScope.MESSAGE_GROUP,
    fifoThroughputLimit: FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
    visibilityTimeout: Duration.minutes(3),
    retentionPeriod: Duration.days(14)
  })

  const shoppingCartHandlers =
    new NodejsFunction(scope, 'ShoppingCartCommandHandlers', {
      entry: 'src/shopping-cart/command-handler.ts',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      environment: {
        EVENT_BUS_NAME: bus.eventBusName,
        TABLE_NAME: table.tableName
      }
    })

  // Batch size can reduce the need for lambda invocations,
  // which will reduce cost and speed up delivery. reportBatchItemFailures
  // is needed to give the Lambda's SQSBatchResponse an effect.
  shoppingCartHandlers.addEventSource(new SqsEventSource(commandQueue, {
    batchSize: 10,
    reportBatchItemFailures: true
  }))

  // The handler publishes its result events and loads and stores the carts
  // it changes. Nothing else in the stack needs that access.
  bus.grantPutEventsTo(shoppingCartHandlers)
  table.grantReadWriteData(shoppingCartHandlers)
}
