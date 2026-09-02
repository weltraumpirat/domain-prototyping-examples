import {Eventbus} from '../../components/eventbus'
import {DomainMessage} from '../../components/messages'
import {EventbusInMemory} from '../../components/eventbus-in-memory'
import {randomUUID} from 'node:crypto'
import {
  UUID
} from '../types'
import {InventoryPolicy} from './policies'
import {CommandQueue} from '../../components/message-queue'
import {CommandQueueInMemory} from '../../components/message-queue-in-memory'
import {
  BlockItemInInventoryCommand,
  RemoveItemsFromInventoryCommand,
  UnblockItemInInventoryCommand
} from './commands'
import {
  ItemAddedToCartEvent,
  ItemRemovedFromCartEvent,
  ShoppingCartCheckedOutEvent
} from '../shopping-cart/events'

describe('InventoryPolicy:', () => {
  let eventbus: Eventbus
  let queue: CommandQueue
  let result: DomainMessage
  const cartId: UUID = randomUUID()
  const productId: UUID = randomUUID()

  beforeEach(() => {
    eventbus = new EventbusInMemory()
    queue = new CommandQueueInMemory()

    const policy = new InventoryPolicy(queue)
    eventbus.subscribe(ItemAddedToCartEvent, policy.handle.bind(policy))
    eventbus.subscribe(ItemRemovedFromCartEvent, policy.handle.bind(policy))
    eventbus.subscribe(ShoppingCartCheckedOutEvent, policy.handle.bind(policy))
  })
  describe('when an item is added to the shopping cart', () => {
    beforeEach(async () => {
      await eventbus.publish(new ItemAddedToCartEvent(
          cartId,
          productId,
          1,
          '10 EUR',
          '5 EUR',
          '15 EUR'))
      await queue.consume(async (msg: DomainMessage) => {
        result = msg
      })
    })
    it('should block that item in inventory', () => {
      expect(result).toEqual({
        id: expect.any(String),
        itemId: productId,
        quantity: 1,
        type: BlockItemInInventoryCommand.type,
      })
    })
  })
  describe('when an item is removed from the shopping cart', () => {
    beforeEach(async () => {
      await eventbus.publish(new ItemRemovedFromCartEvent(
          cartId,
          productId,
          1,
          '10 EUR',
          '5 EUR',
          '15 EUR'))
      await queue.consume(async (msg: DomainMessage) => {
        result = msg
      })
    })

    it('should unblock that item in inventory', () => {
      expect(result).toEqual({
        id: expect.any(String),
        itemId: productId,
        quantity: 1,
        type: UnblockItemInInventoryCommand.type,
      })
    })
  })
  describe('when the order is placed', () => {
    beforeEach(async () => {
      await eventbus.publish(new ShoppingCartCheckedOutEvent(randomUUID(), [{
        id: randomUUID(),
        productId,
        quantity: 1,
        pricePerUnit: '10 EUR'
      }], '10 EUR'))
      await queue.consume(async (msg: DomainMessage) => {
        result = msg
      })
    })

    it('should remove all ordered items from inventory', () => {
      expect(result).toEqual({
        id: expect.any(String),
        items: [
          {
            productId,
            quantity: 1
          }
        ],
        type: RemoveItemsFromInventoryCommand.type,
      })
    })
  })
})
