import {Eventbus} from '../../components/eventbus'
import {EventbusInMemory} from '../../components/eventbus-in-memory'
import {
  DomainCommand,
  DomainMessage
} from '../../components/messages'
import {UUID} from '../types'
import {randomUUID} from 'node:crypto'
import {SendConfirmationEmailCommand,} from './commands'
import {NotificationPolicy} from './policies'
import {OrderPlacedEvent} from '../orders/events'
import {Order} from '../orders/types'
import {Timekeeper} from '../../components/timekeeper'

describe('NotificationPolicy:', () => {
  let eventbus: Eventbus
  let result: DomainMessage
  const productId: UUID = randomUUID()

  beforeEach(() => {
    eventbus = new EventbusInMemory()
    eventbus.subscribe('*', async (msg: DomainCommand) => {
      result = msg
    })
    new NotificationPolicy(eventbus)
  })

  describe('when a cart is checked out', () => {
    const orderId: UUID = randomUUID()
    const customerId: UUID = randomUUID()
    const address: string = '123 Main St, CA 90210 Beverly Hills'

    beforeEach((done) => {

      eventbus.subscribe(SendConfirmationEmailCommand, async () => {
        done()
      })
      const order: Order = {
        id: orderId,
        customerId: customerId, items: [{
          id: randomUUID(),
          productId,
          quantity: 1,
          pricePerUnit: '10 EUR'
        }], metadata: {
          timestamp: Timekeeper.now(),
          deliveryAddress: address,
          invoiceAddress: address,
          totalValue: '10 EUR'
        },
      }
      eventbus.publish(new OrderPlacedEvent(order))
    })

    it('should send a notification email', () => {
      expect(result).toEqual({
        id: expect.any(String),
        order: {
          id: orderId,
          customerId: customerId,
          items: [
            {
              id: expect.any(String),
              pricePerUnit: '10 EUR',
              productId,
              quantity: 1
            }
          ],
          metadata: {
            timestamp: expect.any(String),
            deliveryAddress: '123 Main St, CA 90210 Beverly Hills',
            invoiceAddress: '123 Main St, CA 90210 Beverly Hills',
            totalValue: '10 EUR'
          },
        },
        type: SendConfirmationEmailCommand.type
      })
    })
  })
})
