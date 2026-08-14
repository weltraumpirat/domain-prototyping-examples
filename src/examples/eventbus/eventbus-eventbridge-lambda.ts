import {EventBridgeClient} from '@aws-sdk/client-eventbridge'
import {
  createPlaceOrderHandler,
  PlaceOrderCommand,
  ShoppingCartRepository
} from '../../domain/shopping-cart'
import {createEventBridgeLambdaHandler} from '../../components/lambda-handlers'
import {EventbusEventBridge} from '../../components/eventbus-eventbridge'

// Lambdas are stateless, so we need actual persistence.
// We will likely want to use an AWS based repository in this environment.
declare const repository: ShoppingCartRepository

// This is our EventBridge-based eventbus.
const client = new EventBridgeClient({})
const eventbus = new EventbusEventBridge(client, 'central', 'shopping-cart')

// This is where we wire up our handlers.
eventbus.subscribe(PlaceOrderCommand, createPlaceOrderHandler(repository, eventbus))

export const handler = createEventBridgeLambdaHandler(eventbus)

// noinspection JSUnusedGlobalSymbols
export default handler
