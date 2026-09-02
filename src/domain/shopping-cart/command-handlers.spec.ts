import {CommandQueueInMemory} from '../../components/message-queue-in-memory'
import {Eventbus} from '../../components/eventbus'
import {EventbusInMemory} from '../../components/eventbus-in-memory'
import {
  ShoppingCartRepository,
  ShoppingCartRepositoryInMemory
} from './repository'
import {
  ShoppingCart,
  ShoppingCartItem,
  ShoppingCartState
} from './types'
import {
  ShoppingCartCommandHandlersEventbus,
  ShoppingCartCommandHandlersQueue
} from './command-handlers'
import {
  AddItemFailedEvent,
  CheckOutFailedEvent,
  ItemAddedToCartEvent,
  ItemRemovedFromCartEvent,
  RemoveItemFailedEvent,
  ShoppingCartCheckedOutEvent
} from './events'
import {
  AddItemToCartCommand,
  CheckOutShoppingCartCommand,
  RemoveItemFromCartCommand
} from './commands'
import {randomUUID} from 'crypto'
import {UUID} from '../types'
import {DomainEvent} from '../../components/messages'

describe('ShoppingCartCommandHandlersQueue:', () => {
  let queue: CommandQueueInMemory
  let eventbus: Eventbus
  let repository: ShoppingCartRepository
  let cart: ShoppingCart
  let handlers: ShoppingCartCommandHandlersQueue
  const productId: UUID = randomUUID()
  let result: DomainEvent | undefined
  const resultHandler: (evt: DomainEvent) => Promise<void> = async (evt) => {
    result = evt
  }

  beforeEach(() => {
    queue = new CommandQueueInMemory()
    eventbus = new EventbusInMemory()
    repository = new ShoppingCartRepositoryInMemory()
    cart = new ShoppingCart()
    handlers = new ShoppingCartCommandHandlersQueue(repository, eventbus)
  })

  describe('when an item is added', () => {
    beforeEach(async () => {
      eventbus.subscribe(ItemAddedToCartEvent, resultHandler)
      eventbus.subscribe(AddItemFailedEvent, resultHandler)
    })
    describe('and the cart had been checked out before', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        cart.checkOut()
        await repository.save(cart)
        await queue.add(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should publish an error event', async () => {
        expect(result).toBeDefined()
        expect((result as AddItemFailedEvent).reason).toEqual('This cart has been checked out and can no longer be modified.')
      })
    })

    describe('and the cart had been cancelled before', () => {
      beforeEach(async () => {
        cart.cancel('CHANGED_MY_MIND')

        await repository.save(cart)
        await queue.add(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should throw an error', async () => {
        expect(result).toBeDefined()
        expect((result as AddItemFailedEvent).reason).toEqual('This cart has been cancelled and can no longer be modified.')
      })
    })

    describe('and the cart is empty', () => {
      beforeEach(async () => {
        await repository.save(cart)
        await queue.add(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should add the item to the cart', async () => {
        expect(result).toEqual({
          cartId: cart.id,
          id: expect.any(String),
          newTotal: '5 EUR',
          previousTotal: '0 EUR',
          price: '5 EUR',
          productId,
          quantity: 1,
          type: ItemAddedToCartEvent.type
        })
      })

    })
    describe('and a previously added item of the same kind exists', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await queue.add(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should calculate a new cart total', async () => {
        expect(result).toEqual({
          cartId: cart.id,
          id: expect.any(String),
          newTotal: '10 EUR',
          previousTotal: '5 EUR',
          price: '5 EUR',
          productId,
          quantity: 1,
          type: ItemAddedToCartEvent.type
        })
      })

      it('should increase the item\'s quantity', async () => {
        expect(cart.items).toEqual([{
          id: expect.any(String),
          pricePerUnit: '5 EUR',
          productId,
          quantity: 2,
        }])
      })
    })
  })

  describe('when an item is removed', () => {
    beforeEach(async () => {
      eventbus.subscribe(ItemRemovedFromCartEvent, resultHandler)
      eventbus.subscribe(RemoveItemFailedEvent, resultHandler)
    })
    describe('and the cart has been cancelled before', () => {
      beforeEach(async () => {
        cart.cancel('CHANGED_MY_MIND')
        await repository.save(cart)
        await queue.add(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('This cart has been cancelled and can no longer be modified.')
      })
    })
    describe('and the cart has been checked out before', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        cart.checkOut()
        await repository.save(cart)
        await queue.add(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('This cart has been checked out and can no longer be modified.')
      })
    })

    describe('and the cart is empty', () => {
      beforeEach(async () => {
        await repository.save(cart)
        await queue.add(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('You cannot remove items from an empty cart.')
      })
    })
    describe('and the cart contains less items than are being removed', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await queue.add(new RemoveItemFromCartCommand(cart.id, productId, 2, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('The number of items you are trying to remove is greater than what\'s in the shopping cart.')
      })
    })
    describe('and the cart contains more items than are being removed', () => {
      beforeEach(async () => {
        cart.addItem(productId, 2, '5 EUR')
        await repository.save(cart)
        await queue.add(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })
      it('should decrease the quantity', () => {
        let expected: ShoppingCartItem = {id: expect.any(String), productId, quantity: 1, pricePerUnit: '5 EUR'}
        expect(cart.items).toEqual([expected])
      })
      it('should calculate the new total price', () => {
        expect((result as ItemRemovedFromCartEvent).previousTotal).toEqual('10 EUR')
        expect((result as ItemRemovedFromCartEvent).newTotal).toEqual('5 EUR')
      })
    })
    describe('and the cart contains an item of the same kind, quantity, and price', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await queue.add(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should remove the item', () => {
        expect(cart.items).toEqual([])
      })

      it('should calculate the new total price', () => {
        expect((result as ItemRemovedFromCartEvent).previousTotal).toEqual('5 EUR')
        expect((result as ItemRemovedFromCartEvent).newTotal).toEqual('0 EUR')
      })
    })
  })
  describe('when cart is checked out', () => {
    beforeEach(() => {
      eventbus.subscribe(CheckOutFailedEvent, resultHandler)
      eventbus.subscribe(ShoppingCartCheckedOutEvent, resultHandler)
    })
    describe('and cart had been checked out before', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        cart.checkOut()

        await repository.save(cart)
        await queue.add(new CheckOutShoppingCartCommand(cart.id))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should throw an error', () => {
        expect((result as CheckOutFailedEvent).reason).toEqual('This cart has already been checked out.')
      })
    })

    describe('and cart had been cancelled before', () => {
      beforeEach(async () => {
        cart.cancel('CHANGED_MY_MIND')
        await repository.save(cart)
        await queue.add(new CheckOutShoppingCartCommand(cart.id))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should throw an error', () => {
        expect((result as CheckOutFailedEvent).reason).toEqual('A previously cancelled cart cannot be checked out.')
      })
    })

    describe('and cart is empty', () => {
      beforeEach(async () => {
        await repository.save(cart)
        await queue.add(new CheckOutShoppingCartCommand(cart.id))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should throw an error', () => {
        expect((result as CheckOutFailedEvent).reason).toEqual('An empty cart cannot be checked out.')
      })
    })
    describe('and cart is not empty', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await queue.add(new CheckOutShoppingCartCommand(cart.id))
        await queue.consume(handlers.handle.bind(handlers))
      })

      it('should set the cart\'s state to CHECKED_OUT to lock the cart for further modification', () => {
        // @ts-ignore
        expect(cart.state).toEqual(ShoppingCartState.CHECKED_OUT)
      })
      it('should emit an event containing all details of the cart', () => {
        expect(result).toEqual({
          id: expect.any(String),
          type: ShoppingCartCheckedOutEvent.type,
          cart: {
            timestamp: expect.any(String),
            cartId: cart.id,
            items: [{id: expect.any(String), productId, quantity: 1, pricePerUnit: '5 EUR'}],
            total: '5 EUR'
          }
        })
      })
    })
  })
})

describe('ShoppingCartCommandHandlersEventbus:', () => {
  let eventbus: Eventbus
  let repository: ShoppingCartRepository
  let cart: ShoppingCart
  const productId: UUID = randomUUID()
  let result: DomainEvent | undefined
  let handlers: ShoppingCartCommandHandlersEventbus

  const resultHandler: (evt: DomainEvent) => Promise<void> = async (evt) => {
    result = evt
  }

  beforeEach(() => {
    eventbus = new EventbusInMemory()
    repository = new ShoppingCartRepositoryInMemory()
    cart = new ShoppingCart()
    handlers = new ShoppingCartCommandHandlersEventbus(repository, eventbus)
  })

  describe('when an item is added', () => {
    beforeEach(async () => {
      eventbus.subscribe(ItemAddedToCartEvent, resultHandler)
      eventbus.subscribe(AddItemFailedEvent, resultHandler)
    })
    describe('and the cart had been checked out before', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        cart.checkOut()
        await repository.save(cart)
        await eventbus.publish(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
      })

      it('should publish an error event', async () => {
        expect(result).toBeDefined()
        expect((result as AddItemFailedEvent).reason).toEqual('This cart has been checked out and can no longer be modified.')
      })
    })

    describe('and the cart had been cancelled before', () => {
      beforeEach(async () => {
        cart.cancel('CHANGED_MY_MIND')

        await repository.save(cart)
        await eventbus.publish(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
      })

      it('should throw an error', async () => {
        expect(result).toBeDefined()
        expect((result as AddItemFailedEvent).reason).toEqual('This cart has been cancelled and can no longer be modified.')
      })
    })

    describe('and the cart is empty', () => {
      beforeEach(async () => {
        await repository.save(cart)
        await eventbus.publish(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
      })

      it('should add the item to the cart', async () => {
        expect(result).toEqual({
          cartId: cart.id,
          id: expect.any(String),
          newTotal: '5 EUR',
          previousTotal: '0 EUR',
          price: '5 EUR',
          productId,
          quantity: 1,
          type: ItemAddedToCartEvent.type
        })
      })

    })
    describe('and a previously added item of the same kind exists', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await eventbus.publish(new AddItemToCartCommand(cart.id, productId, 1, '5 EUR'))
      })

      it('should calculate a new cart total', async () => {
        expect(result).toEqual({
          cartId: cart.id,
          id: expect.any(String),
          newTotal: '10 EUR',
          previousTotal: '5 EUR',
          price: '5 EUR',
          productId,
          quantity: 1,
          type: ItemAddedToCartEvent.type
        })
      })

      it('should increase the item\'s quantity', async () => {
        expect(cart.items).toEqual([{
          id: expect.any(String),
          pricePerUnit: '5 EUR',
          productId,
          quantity: 2,
        }])
      })
    })
  })

  describe('when an item is removed', () => {
    beforeEach(async () => {
      eventbus.subscribe(ItemRemovedFromCartEvent, resultHandler)
      eventbus.subscribe(RemoveItemFailedEvent, resultHandler)
    })
    describe('and the cart has been cancelled before', () => {
      beforeEach(async () => {
        cart.cancel('CHANGED_MY_MIND')
        await repository.save(cart)
        await eventbus.publish(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('This cart has been cancelled and can no longer be modified.')
      })
    })
    describe('and the cart has been checked out before', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        cart.checkOut()
        await repository.save(cart)
        await eventbus.publish(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('This cart has been checked out and can no longer be modified.')
      })
    })

    describe('and the cart is empty', () => {
      beforeEach(async () => {
        await repository.save(cart)
        await eventbus.publish(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('You cannot remove items from an empty cart.')
      })
    })
    describe('and the cart contains less items than are being removed', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await eventbus.publish(new RemoveItemFromCartCommand(cart.id, productId, 2, '5 EUR'))
      })
      it('should throw an error', () => {
        expect((result as RemoveItemFailedEvent).reason).toEqual('The number of items you are trying to remove is greater than what\'s in the shopping cart.')
      })
    })
    describe('and the cart contains more items than are being removed', () => {
      beforeEach(async () => {
        cart.addItem(productId, 2, '5 EUR')
        await repository.save(cart)
        await eventbus.publish(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
      })
      it('should decrease the quantity', () => {
        let expected: ShoppingCartItem = {id: expect.any(String), productId, quantity: 1, pricePerUnit: '5 EUR'}
        expect(cart.items).toEqual([expected])
      })
      it('should calculate the new total price', () => {
        expect((result as ItemRemovedFromCartEvent).previousTotal).toEqual('10 EUR')
        expect((result as ItemRemovedFromCartEvent).newTotal).toEqual('5 EUR')
      })
    })
    describe('and the cart contains an item of the same kind, quantity, and price', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await eventbus.publish(new RemoveItemFromCartCommand(cart.id, productId, 1, '5 EUR'))
      })

      it('should remove the item', () => {
        expect(cart.items).toEqual([])
      })

      it('should calculate the new total price', () => {
        expect((result as ItemRemovedFromCartEvent).previousTotal).toEqual('5 EUR')
        expect((result as ItemRemovedFromCartEvent).newTotal).toEqual('0 EUR')
      })
    })
  })
  describe('when cart is checked out', () => {
    beforeEach(() => {
      eventbus.subscribe(CheckOutFailedEvent, resultHandler)
      eventbus.subscribe(ShoppingCartCheckedOutEvent, resultHandler)
    })
    describe('and cart had been checked out before', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        cart.checkOut()

        await repository.save(cart)
        await eventbus.publish(new CheckOutShoppingCartCommand(cart.id))
      })

      it('should throw an error', () => {
        expect((result as CheckOutFailedEvent).reason).toEqual('This cart has already been checked out.')
      })
    })

    describe('and cart had been cancelled before', () => {
      beforeEach(async () => {
        cart.cancel('CHANGED_MY_MIND')
        await repository.save(cart)
        await eventbus.publish(new CheckOutShoppingCartCommand(cart.id))
      })

      it('should throw an error', () => {
        expect((result as CheckOutFailedEvent).reason).toEqual('A previously cancelled cart cannot be checked out.')
      })
    })

    describe('and cart is empty', () => {
      beforeEach(async () => {
        await repository.save(cart)
        await eventbus.publish(new CheckOutShoppingCartCommand(cart.id))
      })

      it('should throw an error', () => {
        expect((result as CheckOutFailedEvent).reason).toEqual('An empty cart cannot be checked out.')
      })
    })
    describe('and cart is not empty', () => {
      beforeEach(async () => {
        cart.addItem(productId, 1, '5 EUR')
        await repository.save(cart)
        await eventbus.publish(new CheckOutShoppingCartCommand(cart.id))
      })

      it('should set the cart\'s state to CHECKED_OUT to lock the cart for further modification', () => {
        // @ts-ignore
        expect(cart.state).toEqual(ShoppingCartState.CHECKED_OUT)
      })
      it('should emit an event containing all details of the cart', () => {
        expect(result).toEqual({
          id: expect.any(String),
          type: ShoppingCartCheckedOutEvent.type,
          cart: {
            timestamp: expect.any(String),
            cartId: cart.id,
            items: [{id: expect.any(String), productId, quantity: 1, pricePerUnit: '5 EUR'}],
            total: '5 EUR'
          }
        })
      })
    })
  })
})


