import {
  DomainMessage,
} from './messages'
import {BaseEventbus} from './eventbus'

export class EventbusInMemory extends BaseEventbus {

  async publish<T extends DomainMessage>(msg: T): Promise<void> {
    // Exact subscribers first, then the '*' monitors.
    const handlers = [
      ...(this._handlers.get(msg.type) ?? []),
      ...(this._handlers.get('*') ?? []),
    ]
    // Fan out in parallel — handlers are independent. If one needs
    // ordering it should subscribe a single handler that drives its
    // own queue.
    await Promise.all(handlers.map((h) => h(msg as T)))
  }
}
