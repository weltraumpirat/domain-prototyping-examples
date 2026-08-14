// Templated interface to allow implementations for any kind of item
import {MessageHandler} from './message-handler'

export interface Queue<T> {
  // Expect the implementation to be asynchronous.
  // Target systems will almost certainly be distributed.
  add (item: T): Promise<void>
  consume (handler: MessageHandler<T>): Promise<void>
}
