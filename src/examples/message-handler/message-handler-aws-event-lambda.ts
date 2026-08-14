import { Handler, EventBridgeEvent } from 'aws-lambda'
import {createEventBridgeLambdaHandler} from '../../components/lambda-handlers'
import {EventbusEventBridge} from '../../components/eventbus-eventbridge'
import {CommandQueue} from '../../components/message-queue'
import {DomainEvent} from '../../components/messages'
import {InventoryPolicy} from '../../domain/inventory'
import {
  ItemAddedToCartEvent,
  ItemRemovedFromCartEvent,
  OrderPlacedEvent
} from '../../domain/shopping-cart'

// Dependencies initialized with AWS-specific versions
declare const commandQueue: CommandQueue
declare const eventbus: EventbusEventBridge

// Here we configure what to actually do with incoming events
const inventoryPolicy = new InventoryPolicy(commandQueue)
const policyHandler= inventoryPolicy.handle.bind(inventoryPolicy)
eventbus.subscribe(ItemAddedToCartEvent, policyHandler)
eventbus.subscribe(ItemRemovedFromCartEvent, policyHandler)
eventbus.subscribe(OrderPlacedEvent, policyHandler)

// Lambda handler only does AWS specific tasks: Unwrap event, pass it on,
// catch errors.
export const handler: Handler<EventBridgeEvent<string, DomainEvent>> =
    createEventBridgeLambdaHandler(eventbus)

// noinspection JSUnusedGlobalSymbols
export default handler
