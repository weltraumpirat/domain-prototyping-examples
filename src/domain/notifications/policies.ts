import {Eventbus} from '../../components/eventbus'
import {SendConfirmationEmailCommand} from './commands'
import {ShoppingCartCheckedOutEvent} from '../shopping-cart/events'

const createWheneverACartIsCheckedOut_sendConfirmationEmail = (eventbus: Eventbus) =>
    async (evt: ShoppingCartCheckedOutEvent): Promise<void> => {
      // Timeout ensures that subsequent commands aren't published
      // before all event handlers were notified - otherwise we might
      // break consistency
      setTimeout(async () => {
        await eventbus.publish(new SendConfirmationEmailCommand(evt.cart))
      }, 1)
    }
// A Policy contains business rules that don't belong to a domain object.
// They are typically triggered by an event, and, based on evaluation of the rules,
// may give a new command. This is particularly useful when crossing context boundaries.
export class NotificationPolicy {
  constructor(readonly eventbus: Eventbus) {
    eventbus.subscribe(ShoppingCartCheckedOutEvent, createWheneverACartIsCheckedOut_sendConfirmationEmail(eventbus))
  }
}
