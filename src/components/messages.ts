import {randomUUID} from 'node:crypto'

import {UUID} from '../domain/types'

export type MessageType = string | '*'
// To make sure that the TypeScript compiler distinguishes
// between DomainCommands and DomainEvents, we use a type-only symbol.
// 'kind' will be dropped during compilation
declare const kind: unique symbol

/** A concrete message class, carrying its own type string as a *static*.
 *  Required to determine the 'type' field reflexively without an actual message instance. */
export type MessageClass<T extends DomainMessage> =
    { readonly type: T['type'] } & (abstract new (...args: any[]) => T)

// All messages carry an ID and a type. Concrete subtypes may add additional properties.
export abstract class DomainMessage<MessageType extends string = string> {
  readonly id: UUID = randomUUID()
  abstract readonly type: MessageType
}

export abstract class DomainCommand<MessageType extends string = string> extends DomainMessage<MessageType> {
  declare readonly [kind]: 'command'
}

export abstract class DomainEvent<MessageType extends string = string> extends DomainMessage<MessageType> {
  declare readonly [kind]: 'event'
}

// This is how we define and instantiate concrete message types:
class TestCommand extends DomainCommand<'TEST'> {
  readonly type = 'TEST' as const
}

class TestedEvent extends DomainEvent<'TESTED'> {
  readonly type = 'TESTED' as const
}

const cmd = new TestCommand()
const evt = new TestedEvent()
