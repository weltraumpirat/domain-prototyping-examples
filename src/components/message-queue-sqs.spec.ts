import {SQSClient, SendMessageCommand} from '@aws-sdk/client-sqs'

jest.mock('@aws-sdk/client-sqs', () => {
  const evb = jest.requireActual('@aws-sdk/client-sqs')
  return {...evb,
    SQSClient: jest.fn(()=>({send: jest.fn()}))}
})

import {
  DomainCommand,
  DomainEvent,
} from './messages'
import {
  CommandQueueSQS,
  EventQueueSQS
} from './message-queue-sqs'


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

describe('EventQueueSQS:', () => {
  let queue: EventQueueSQS
  let client: SQSClient

  beforeEach(() => {
    client = new SQSClient({})
    queue = new EventQueueSQS({sqs: client, messageGroupProperty: 'id', queueUrl:'some url'})
  })

  const first = new TestedEvent()
  const second = new AnotherEvent()

  it('should apply a given handler to messages in the order received', async () => {
    let result: DomainEvent | undefined

    await queue.receive(first)
    await queue.receive(second)

    const handler = async (msg: DomainEvent) => {
      result = msg
    }
    await queue.consume(handler)
    expect(result).toEqual(first)
    await queue.consume(handler)
    expect(result).toEqual(second)
  })

  it('should rethrow error if one occurs', async () => {
    await queue.receive(first)
    const throwingHandler = async (_: DomainEvent) => {
      throw new Error('Something went wrong!')
    }
    let error: Error | undefined
    await queue.consume(throwingHandler).catch(e => {
      error = e
    })
    expect(error).toBeDefined()
  })

  it('should send message to SQS when one is added', async () => {
    await queue.add(first)
    expect( client.send).toHaveBeenCalledWith(expect.any(SendMessageCommand))
  })
})

describe('CommandQueueSQS:', () => {
  let queue: CommandQueueSQS
  let client: SQSClient

  beforeEach(() => {
    client = new SQSClient({})
    queue = new CommandQueueSQS({sqs: client, messageGroupProperty: 'id', queueUrl:'some url'})
  })


  const first = new SomeCommand()
  const second = new SomeCommand()

  it('should apply a given handler to messages in the order received', async () => {
    let result: DomainCommand | undefined

    await queue.receive(first)
    await queue.receive(second)

    const handler = async (msg: DomainCommand) => {
      result = msg
    }
    await queue.consume(handler)
    expect(result).toEqual(first)
    await queue.consume(handler)
    expect(result).toEqual(second)
  })

  it('should rethrow error if one occurs', async () => {
    await queue.receive(first)
    const throwingHandler = async (_: DomainCommand) => {
      throw new Error('Something went wrong!')
    }
    let error: Error | undefined
    await queue.consume(throwingHandler).catch(e => {
      error = e
    })
    expect(error).toBeDefined()
  })

  it('should send message to SQS when one is added', async () => {
    await queue.add(first)
    expect( client.send).toHaveBeenCalledWith(expect.any(SendMessageCommand))
  })
})
