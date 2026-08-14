import {
  DomainCommand,
  DomainEvent
} from './messages'

export type MessageHandler<T> = (message: T) => Promise<void>
export type CommandHandler<T extends DomainCommand> = (command: T) => Promise<void>
export type EventHandler<T extends DomainEvent>     = (event: T)   => Promise<void>
