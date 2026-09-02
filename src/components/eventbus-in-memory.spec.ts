import {EventbusInMemory} from './eventbus-in-memory'
import {Eventbus} from './eventbus'
import {
  DomainCommand,
  DomainEvent,
  DomainMessage
} from './messages'

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

describe('EventbusInMemory:', () => {
  let eventbus: Eventbus
  beforeEach(() => {
    eventbus = new EventbusInMemory()
  })

  it('delivers command to subscriber', async () => {
    let result: DomainMessage | undefined
    eventbus.subscribe(SomeCommand, async (msg: DomainMessage) => {
      result = msg
    })
    const sentCommand: SomeCommand = new SomeCommand()
    await eventbus.publish(sentCommand)

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

  it('delivers events to multiple subscribers', async () => {
    let result1: DomainMessage | undefined
    let result2: DomainMessage | undefined
    eventbus.subscribe(TestedEvent, async (evt: DomainMessage) => {
      result1 = evt
    })
    eventbus.subscribe(TestedEvent, async (evt: DomainMessage) => {
      result2 = evt
    })
    const sentEvent: TestedEvent = new TestedEvent()
    await eventbus.publish(sentEvent)

    expect(result1).toEqual(sentEvent)
    expect(result2).toEqual(sentEvent)

  })

  it('delivers all messages to subscribers to *', async () => {
    let result: DomainMessage | undefined
    eventbus.subscribe('*', async (evt: DomainMessage) => {
      result = evt
    })
    await eventbus.publish(new TestedEvent())
    expect(result!.type).toEqual('TESTED')

    await eventbus.publish(new AnotherEvent())
    expect(result!.type).toEqual('ANOTHER')

    await eventbus.publish(new SomeCommand())
    expect(result!.type).toEqual('SOME')
  })
})
