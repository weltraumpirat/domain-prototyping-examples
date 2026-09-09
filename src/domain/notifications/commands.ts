// noinspection JSUnusedGlobalSymbols

import {randomUUID} from 'node:crypto'
import {
  AccountNumber,
  UUID
} from '../types'
import {DomainCommand} from '../../components/messages'
import {Order} from '../orders/types'

export class SendEmailNotificationCommand extends DomainCommand<'SEND_EMAIL_NOTIFICATION'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'SEND_EMAIL_NOTIFICATION' as const
  readonly type = SendEmailNotificationCommand.type

  constructor(readonly account: AccountNumber, readonly subject: string, readonly body: string) {
    super()
  }
}

export class SendConfirmationEmailCommand extends DomainCommand<'SEND_CONFIRMATION_EMAIL'> {
  static readonly type = 'SEND_CONFIRMATION_EMAIL' as const
  readonly type = SendConfirmationEmailCommand.type

  constructor(readonly order: Order) {
    super()
  }
}
