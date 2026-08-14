import {Eventbus} from '../components/eventbus'
import {OrderPlacedEvent} from './shopping-cart'
import {DomainCommand} from '../components/messages'
import {Order} from './types'

export class SendConfirmationEmailCommand extends DomainCommand<'SEND_CONFIRMATION_EMAIL'> {
  static readonly type = 'SEND_CONFIRMATION_EMAIL' as const
  readonly type = SendConfirmationEmailCommand.type
  constructor(readonly order: Order) {
    super()
  }
}

const createWheneverAnOrderIsPlaced_sendConfirmationEmail = (bus: Eventbus) =>
    async (evt: OrderPlacedEvent): Promise<void> => {
      await bus.publish(new SendConfirmationEmailCommand(evt.order))
    }

// A Policy contains business rules that don't belong to a domain object.
// They are typically triggered by an event, and, based on evaluation of the rules,
// may give a new command. This is particularly useful when crossing context boundaries.
export class OrderPolicy {
  constructor(readonly bus: Eventbus) {
    bus.subscribe(OrderPlacedEvent, createWheneverAnOrderIsPlaced_sendConfirmationEmail(bus))
  }
}


