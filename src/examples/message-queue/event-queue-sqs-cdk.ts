import { Duration } from 'aws-cdk-lib'
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events'
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { IQueue, Queue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

// The bus and target command queues already exist elsewhere.
// noinspection JSUnusedGlobalSymbols
export function wireBonusPointsPolicy(
    scope: Construct,
    bus: IEventBus,
    bonusPointsQueue: IQueue,
    sendNotificationQueue: IQueue
) {
  const eventQueue = new Queue(scope, 'WithdrawalEventQueue', {
    fifo: true,
    // Required for a FIFO Rule target: EventBridge sends no deduplication id,
    // so the queue has to derive one itself, or it rejects the message.
    contentBasedDeduplication: true,
    visibilityTimeout: Duration.minutes(3),
    retentionPeriod: Duration.days(14)
  })

  const bonusPointsPolicy =
      new NodejsFunction(scope, 'BonusPointsPolicy', {
        entry: 'src/bonus-points/policy-handler.ts',
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(30),
        environment: {
          BONUS_POINTS_QUEUE_URL: bonusPointsQueue.queueUrl
        }
      })

  // Same wiring as on the command side: the queue invokes the Lambda, and the
  // Lambda's SQSBatchResponse decides what stays in the queue.
  bonusPointsPolicy.addEventSource(new SqsEventSource(eventQueue, {
    batchSize: 10,
    reportBatchItemFailures: true
  }))

  // The Rule's target is the queue, not the Lambda. That is what buys us the
  // wait: the event sits there until the policy is free to take it, and a
  // failure puts it back, rather than into EventBridge's retry-then-drop.
  new Rule(scope, 'BonusPointsPolicyRule', {
    eventBus: bus,
    eventPattern: {
      source: ['accounts'],
      // WITHDRAWAL_REJECTED gets a rule, queue and Lambda of its own. In
      // memory, one class subscribed to both result events; keeping them apart
      // here means a stuck e-mail cannot hold up the bonus points.
      detailType: ['FUNDS_WITHDRAWN']
    },
    targets: [
      new SqsQueue(eventQueue, {
        // A FIFO target needs a message group, and EventBridge can only supply
        // a fixed one — it cannot read the account number out of the event the
        // way the producer Lambda does. So every withdrawal event shares one
        // group, and the policy works through them strictly one at a time. If
        // that becomes the bottleneck, split the rule by a coarser key, or let
        // the command handler send here directly and choose the group itself.
        messageGroupId: 'withdrawal-events'
      })
    ]
  })

  // The policy passes commands on to command queues; it never publishes to the bus.
  bonusPointsQueue.grantSendMessages(bonusPointsPolicy)
  sendNotificationQueue.grantSendMessages(bonusPointsPolicy)
}
