import {MessageHandler} from './message-handler'
import {
  DomainCommand,
  DomainMessage,
  MessageClass,
  MessageType
} from './messages'

export interface Eventbus {
  /** Subscribers specify the subscribed message type by passing its *class*, not by a name (string).
   *  Command types allow only exactly one handler; events fan out to as many as subscribe.
   **/
  subscribe<T extends DomainMessage>(type: MessageClass<T> | '*', handler: MessageHandler<T>): void
  publish<T extends DomainMessage>(msg: T): Promise<void>
}

export abstract class BaseEventbus implements Eventbus {
  protected readonly _handlers: Map<MessageType, MessageHandler<DomainMessage>[]> = new Map()

  subscribe<T extends DomainMessage>(type: MessageClass<T> | '*', handler: MessageHandler<T>): void {
    const widened = handler as MessageHandler<DomainMessage>
    const key = type === '*' ? '*' : type.type
    const existing = this._handlers.get(key)
    if (!existing) {
      this._handlers.set(key, [widened])
      // Command types accept only a single subscriber.
    } else if (type !== '*' && type.prototype instanceof DomainCommand) {
      throw new Error('You can only subscribe one handler for each Domain Command.')
    } else {
      existing.push(widened)
    }
  }

  abstract publish<T extends DomainMessage>(msg: T): Promise<void>;
}
