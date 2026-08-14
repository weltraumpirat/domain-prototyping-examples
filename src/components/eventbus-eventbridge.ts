import {
  DomainMessage,
} from './messages'
import {
  EventBridgeClient,
  PutEventsCommand
} from '@aws-sdk/client-eventbridge'
import {
  BaseEventbus,
} from './eventbus'

/**
 * Although the interface implementation may create the impression, this
 * class acts only partially as an actual proxy to EventBridge: Publish()
 * calls the EventBridge API and sends messages via the actual service.
 * Receiving messages, however, requires bending the idea of the Eventbus
 * interface: To ever run any code when a message is passed through
 * the bus, we must create a Rule — which is part of infrastructure
 * setup, rather than runtime: Only a Rule could trigger the Lambda that
 * would ever execute this code, so we can't create it ad hoc.
 * The subscribe() method is used for the invoked Lambda handler to route
 * received messages to the right message handler, so it is still useful.
 * It is important to remember that a complete message route requires BOTH
 * the Rule AND calling subscribe() here.
 */
export class EventbusEventBridge extends BaseEventbus {
  constructor(
      private readonly _client: EventBridgeClient,
      private readonly _busName: string,
      private readonly _source: string,
  ) {
    super()
  }

  /**
   * Accepts inbound messages from EventBridge and passes them on to subscribers.
   **/
  async receive<T extends DomainMessage>(msg: T): Promise<void> {
    const handlers = [
      ...(this._handlers.get(msg.type) ?? []),
      ...(this._handlers.get('*') ?? []),
    ]
    await Promise.all(handlers.map((h) => h(msg)))
  }

  /**
  * Publishes outbound messages to EventBridge. **DOES NOT** directly forward to subscribers.
  **/
  async publish<T extends DomainMessage>(msg: T): Promise<void> {
    await this._client.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: this._busName,
              Source: this._source,
              DetailType: msg.type,
              Detail: JSON.stringify(msg),
            },
          ],
        }),
    )
  }
}
