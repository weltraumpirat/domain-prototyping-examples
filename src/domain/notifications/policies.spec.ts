import {Eventbus} from '../../components/eventbus'
import {EventbusInMemory} from '../../components/eventbus-in-memory'
import {
  DomainCommand,
  DomainMessage
} from '../../components/messages'
import {
  UUID
} from '../types'
import {randomUUID} from 'node:crypto'
import {
  SendConfirmationEmailCommand,
} from './commands'
import {NotificationPolicy} from './policies'
import {ShoppingCartCheckedOutEvent} from '../shopping-cart/events'

describe('NotificationPolicy:', () => {
  let eventbus: Eventbus
  let result: DomainMessage
  const productId: UUID = randomUUID()
  const cartId: UUID = randomUUID()

  beforeEach(() => {
    eventbus = new EventbusInMemory()
    eventbus.subscribe('*', async (msg: DomainCommand) => {
      result = msg
    })
    new NotificationPolicy(eventbus)
  })

  describe('when a cart is checked out', () => {
    beforeEach( (done) => {

      eventbus.subscribe(SendConfirmationEmailCommand, async()=>{
        done()
      })
      eventbus.publish(new ShoppingCartCheckedOutEvent(cartId, [{
        id: randomUUID(),
        productId,
        quantity: 1,
        pricePerUnit: '10 EUR'
      }], '10 EUR' ))
    })

    it('should send a notification email', () => {
      expect(result).toEqual({
        id: expect.any(String),
        cart: {
          cartId: expect.any(String),
          items: [
            {
              id: expect.any(String),
              pricePerUnit: "10 EUR",
              productId,
              quantity: 1
            }
          ],
          timestamp: expect.any(String),
          total: "10 EUR"
        },
        type: SendConfirmationEmailCommand.type
      })
    })
  })
})
