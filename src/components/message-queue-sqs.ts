import {
  SendMessageCommand,
  SQSClient
} from '@aws-sdk/client-sqs'
import {
  MessageQueue
} from './message-queue'
import {MessageHandler} from './message-handler'
import {
  DomainCommand,
  DomainEvent,
  DomainMessage
} from './messages'

/** SQS wants a MessageGroupId string, so only the string-valued fields of a message
 *  are eligible as a group key. */
type StringKeyOf<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T]

export interface SQSConfiguration<T extends DomainMessage> {
  sqs: SQSClient,
  /** FIFO guarantees the order of messages *within a message group*, not across the queue.
   *  We specify a messageGroupIdProperty — the field of a message that is used to determine which messages must be
   *  kept in order. This could be 'username', 'cartId', or 'account', for example.
   * Since these will be different for every message type, we pass the name of the field into the constructor.
   **/
  messageGroupProperty: StringKeyOf<T>,
  queueUrl : string
}

/** Generic in the *concrete* command type: the group key usually lives on the subtype, not on the abstract
 *  DomainCommand. Defaults to DomainCommand so a consumer which never add()s and passes no configuration
 *  needs no type argument. */
export class CommandQueueSQS<T extends DomainCommand = DomainCommand> implements MessageQueue<T> {
  private _messages: T[] = []

  constructor (
      // We only need to set up SQS if we use add(). Therefore, the configuration is optional.
      private readonly sqsConfig?: SQSConfiguration<T>
  ) {}

  public async add( message: T ): Promise<void> {

    const {sqs, queueUrl, messageGroupProperty } = this.sqsConfig!

    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      // StringKeyOf already guarantees this is a string; the compiler can't see
      // through the indexed access on an unresolved T, so we assert it.
      MessageGroupId: message[messageGroupProperty] as string
    }))
  }

  public async receive( message: T): Promise<void>{
    this._messages.unshift(message)
  }

  public async consume(handler: MessageHandler<T>): Promise<void> {
    const msg = this._messages.pop()
    if(msg) {
      await handler(msg)
    }
  }
}

/** Same shape as CommandQueueSQS above, and generic for the same reason:
 *  the message group key lives on the concrete event type. */
export class EventQueueSQS<T extends DomainEvent = DomainEvent> implements MessageQueue<T> {
  private _messages: T[] = []

  constructor (
      // We only need to set up SQS if we use add(). Therefore, the configuration is optional.
      private readonly sqsConfig?: SQSConfiguration<T>
  ) {}

  public async add( message: T ): Promise<void> {
    const {sqs, queueUrl, messageGroupProperty } = this.sqsConfig!
    await sqs.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageGroupId: message[messageGroupProperty] as string
    }))
  }

  public async receive( message: T): Promise<void>{
    this._messages.unshift(message)
  }

  public async consume(handler: MessageHandler<T>): Promise<void> {
    const msg = this._messages.pop()
    if(msg) {
      await handler(msg)
    }
  }
}
