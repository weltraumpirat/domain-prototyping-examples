import {
  CommandQueue,
  EventQueue,
  MessageQueue
} from './message-queue'
import {MessageHandler} from './message-handler'
import {
  DomainCommand,
  DomainEvent,
  DomainMessage
} from './messages'

export class MessageQueueInMemory implements MessageQueue<DomainMessage> {
  private _messages: DomainMessage[] = []

  public async add( message: DomainMessage ): Promise<void> {
    // add incoming messages to the beginning of the queue
    this._messages.unshift(message)
  }

  public async consume(handler: MessageHandler<DomainMessage>): Promise<void> {
    const msg = this._messages.pop()
    if(msg) {
      try {
        // Apply the handler function
        await handler(msg)
      } catch (err) {
        console.error(err)
        // If an error is thrown, we put the message back in the queue,
        // so that it's next in line when we try again
        this._messages.push(msg)
      }
    }
  }
}

export class CommandQueueInMemory implements CommandQueue {
  private _messages: DomainCommand[] = []

  public async add( message: DomainCommand ): Promise<void> {
    this._messages.unshift(message)
  }

  public async consume(handler: MessageHandler<DomainCommand>): Promise<void> {
    const msg = this._messages.pop()
    if(msg) {
      try {
        await handler(msg)
      } catch (err) {
        console.error(err)
        this._messages.push(msg)
      }
    }
  }
}

export class EventQueueInMemory implements EventQueue {
  private _messages: DomainEvent[] = []

  public async add( message: DomainEvent ): Promise<void> {
    this._messages.unshift(message)
  }

  public async consume(handler: MessageHandler<DomainEvent>): Promise<void> {
    const msg = this._messages.pop()
    if(msg) {
      try {
        await handler(msg)
      } catch (err) {
        console.error(err)
        this._messages.push(msg)
      }
    }
  }
}
