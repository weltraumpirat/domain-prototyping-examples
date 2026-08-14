import { Duration } from 'aws-cdk-lib'
import { IEventBus, Rule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { IQueue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'

// The bus and the Inventory context's command queue already exist elsewhere.
export function wireInventoryPolicyHandler(
    scope: Construct,
    bus: IEventBus,
    inventoryCommandQueue: IQueue
) {
  const inventoryPolicy =
      new NodejsFunction(scope, 'InventoryPolicyHandlers', {
        entry: 'src/inventory/policy-handler.ts',
        runtime: Runtime.NODEJS_22_X,
        timeout: Duration.seconds(30),
        environment: {
          EVENT_BUS_NAME: bus.eventBusName,
          COMMAND_QUEUE_URL: inventoryCommandQueue.queueUrl
        }
      })

  // Only shopping cart events ever reach the Lambda.
  new Rule(scope, 'InventoryPolicyRule', {
    eventBus: bus,
    eventPattern: {
      source: ['shopping-cart'],
      detailType: [
        'ItemAddedToCartEvent',
        'ItemRemovedFromCartEvent',
        'ShoppingCartCheckedOutEvent'
      ]
    },
    targets: [
      new LambdaFunction(inventoryPolicy, {
        // Delivery retries can be limited here, rather than default to
        // EventBridge's 185 attempts over 24 hours.
        retryAttempts: 20,
        maxEventAge: Duration.hours(1)
      })
    ]
  })

  // The policy sends commands to the inventory command queue,
  // so it needs no put-events permission on the bus.
  inventoryCommandQueue.grantSendMessages(inventoryPolicy)
}
