import * as events from 'aws-cdk-lib/aws-events'
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import {Construct} from 'constructs'

export function wireShoppingRules(
    scope: Construct,
    bus: events.IEventBus,
    shoppingCartHandlers: lambda.IFunction,
    orderPolicy: lambda.IFunction,
) {
  new events.Rule(scope, 'PlaceOrderRule', {
    eventBus: bus,
    eventPattern: { detailType: ['PlaceOrder'] },
    targets: [new targets.LambdaFunction(shoppingCartHandlers)],
  })

  new events.Rule(scope, 'OrderPlacedRule', {
    eventBus: bus,
    eventPattern: { detailType: ['OrderPlaced'] },
    targets: [new targets.LambdaFunction(orderPolicy)],
  })
}
