import {
  EventBridgeClient,
  PutEventsCommand
} from '@aws-sdk/client-eventbridge'

jest.mock('@aws-sdk/client-eventbridge', () => {
  const evb = jest.requireActual('@aws-sdk/client-eventbridge')
  return {...evb,
    EventBridgeClient: jest.fn(()=>({send: jest.fn()}))}
})

import {
  DomainCommand,
  DomainEvent,
  DomainMessage
} from './messages'
import {EventbusEventBridge} from './eventbus-eventbridge'

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

describe('EventbusEventBridge:', () => {
  let eventbus: EventbusEventBridge
  let client: EventBridgeClient
  beforeEach(() => {
    client = new EventBridgeClient({})
    eventbus = new EventbusEventBridge(client, 'main', 'test')
  })

  it('delivers incoming command to subscriber', async () => {
    let result: DomainMessage | undefined
    eventbus.subscribe(SomeCommand, async (msg: DomainMessage) => {
      result = msg
    })
    const sentCommand: SomeCommand = new SomeCommand()
    await eventbus.receive(sentCommand)

    expect(result).toEqual(sentCommand)
  })

  it('only allows one subscriber per command type', async () => {
    eventbus.subscribe(SomeCommand, async (_: DomainMessage) => {
      console.log('one')
    })
    expect(() => eventbus.subscribe(SomeCommand, async (_: DomainMessage) => {
      console.log('two')
    })).toThrow()
  })

  it('delivers incoming events to multiple subscribers', async () => {
    let result1: DomainMessage | undefined
    let result2: DomainMessage | undefined
    eventbus.subscribe(TestedEvent, async (evt: DomainMessage) => {
      result1 = evt
    })
    eventbus.subscribe(TestedEvent, async (evt: DomainMessage) => {
      result2 = evt
    })
    const sentEvent: TestedEvent = new TestedEvent()
    await eventbus.receive(sentEvent)

    expect(result1).toEqual(sentEvent)
    expect(result2).toEqual(sentEvent)

  })

  it('delivers all incoming messages to subscribers to *', async () => {
    let result: DomainMessage | undefined
    eventbus.subscribe('*', async (evt: DomainMessage) => {
      result = evt
    })
    await eventbus.receive(new TestedEvent())
    expect(result!.type).toEqual('TESTED')

    await eventbus.receive(new AnotherEvent())
    expect(result!.type).toEqual('ANOTHER')

    await eventbus.receive(new SomeCommand())
    expect(result!.type).toEqual('SOME')
  })

  it('published outgoing messages to the EventBridge eventbus', async () => {
    let result: DomainMessage | undefined
    eventbus.subscribe('*', async (evt: DomainMessage) => {
      result = evt
    })

    await eventbus.publish(new TestedEvent())
    expect(result).toBeUndefined()
    expect(client.send).toHaveBeenCalledWith(expect.any(PutEventsCommand))
  })
})
