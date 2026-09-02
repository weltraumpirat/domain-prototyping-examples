import {
  DomainCommand,
  DomainEvent,
  DomainMessage
} from './messages'
import {
  MessageQueue
} from './message-queue'
import {
  CommandQueueInMemory,
  EventQueueInMemory,
  MessageQueueInMemory
} from './message-queue-in-memory'


class TestedEvent extends DomainEvent<'TESTED'> {
  static readonly type = 'TESTED'
  override readonly type = 'TESTED'
}

class AnotherEvent extends DomainEvent<'ANOTHER'> {
  static readonly type = 'ANOTHER'
  override readonly type = 'ANOTHER'
}

class SomeCommand extends DomainCommand<'SOME'> {
  static readonly type = 'SOME'
  override readonly type = 'SOME'
}

function testQueue<T extends DomainMessage>(queue: MessageQueue<T>, messages: T[]): void {
  const first = messages[0]
  const second = messages[1]

  it('should apply a given handler to messages in the order received', async () => {
    let result: T | undefined

    await queue.add(first)
    await queue.add(second)

    const handler = async (msg: T) => {
      result = msg
    }
    await queue.consume(handler)
    expect(result).toEqual(first)
    await queue.consume(handler)
    expect(result).toEqual(second)
  })

  it('should requeue messages if an error occurs', async () => {
    let result: DomainMessage | undefined

    await queue.add(first)
    await queue.add(second)

    const handler = async (msg: DomainMessage) => {
      result = msg
    }
    const throwingHandler = async (_: DomainMessage) => {
      throw new Error('Something went wrong!')
    }
    await queue.consume(throwingHandler)
    expect(result).toBeUndefined()

    await queue.consume(handler)
    expect(result).toEqual(first)
  })
}

describe('MessageQueueInMemory:', () => {
  testQueue(new MessageQueueInMemory(), [new TestedEvent(), new AnotherEvent()])
})

describe('EventQueueInMemory:', () => {
  testQueue(new EventQueueInMemory(), [new TestedEvent(), new AnotherEvent()])
})

describe('CommandQueueInMemory:', () => {
  testQueue(new CommandQueueInMemory(), [new SomeCommand(), new SomeCommand()])
})
