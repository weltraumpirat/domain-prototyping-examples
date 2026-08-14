import {Queue} from './queue'
import {
  DomainCommand,
  DomainEvent,
  DomainMessage
} from './messages'

// We extend the templated Queue type to make it concrete.
// No further internals are necessary.
export interface MessageQueue<T extends DomainMessage> extends Queue<T> {}
export interface CommandQueue extends MessageQueue<DomainCommand> {}
export interface EventQueue extends MessageQueue<DomainEvent> {}
