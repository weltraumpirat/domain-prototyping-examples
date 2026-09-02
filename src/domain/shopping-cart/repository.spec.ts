import {
  ShoppingCartRepository,
  ShoppingCartRepositoryInMemory
} from './repository'
import {
  ShoppingCart
} from './types'
import {randomUUID} from 'node:crypto'

function testShoppingCartRepository(repository: ShoppingCartRepository) {
  afterEach(async () => {
    await repository.removeAll()
  })

  describe(repository.constructor.name + ':', () => {
    describe('when getting a cart by ID', () => {
      describe('and the cart exists', () => {
        let id: string
        let cart: ShoppingCart

        beforeEach(async () => {
          cart = new ShoppingCart()
          id = cart.id
          await repository.save(cart)
        })

        it('should return the cart', async () => {
          expect(await repository.getById(id)).toEqual(cart)
        })
      })
      describe('and the cart does not exist', () => {
        let id: string
        let cart: ShoppingCart

        beforeEach(async () => {
          cart = new ShoppingCart()
          await repository.save(cart)
          id = randomUUID()
        })

        it('should throw', async () => {
          let error: Error | undefined
          await repository.getById(id).catch((err: Error) => error = err)
          expect(error).toBeDefined()
        })
      })
    })

    describe('when finding a cart by ID', () => {
      describe('and the cart exists', () => {
        let id: string
        let cart: ShoppingCart

        beforeEach(async () => {
          cart = new ShoppingCart()
          id = cart.id
          await repository.save(cart)
        })

        it('should return the cart', async () => {
          expect(await repository.findById(id)).toEqual(cart)
        })
      })
      describe('and the cart does not exist', () => {
        let id: string
        let cart: ShoppingCart

        beforeEach(async () => {
          cart = new ShoppingCart()
          await repository.save(cart)
          id = randomUUID()
        })

        it('should return undefined', async () => {
          expect(await repository.findById(id)).toBeUndefined()
        })
      })
    })
    describe('when getting all carts', () => {
      describe('and no carts exist', () => {
        it('should return empty array', async () => {
          expect(await repository.getAll()).toEqual([])
        })
      })
      describe('and carts exists', () => {
        let cart: ShoppingCart
        beforeEach(async () => {
          cart = new ShoppingCart()
          await repository.save(cart)
        })

        it('should return list of carts', async () => {
          expect(await repository.getAll()).toEqual([cart])
        })
      })
    })

    describe('when adding an cart', () => {
      beforeEach(async () => {
        expect(await repository.getAll()).toEqual([])
        await repository.save(new ShoppingCart())
      })

      it('should retain the cart', async () => {
        expect(await repository.getAll()).toHaveLength(1)
      })
    })
    describe('when adding a list of carts', () => {
      beforeEach(async () => {
        expect(await repository.getAll()).toEqual([])
        await repository.saveAll([new ShoppingCart(), new ShoppingCart()])
      })

      it('should retain the carts', async () => {
        expect(await repository.getAll()).toHaveLength(2)
      })
    })
    describe('when removing an cart', () => {
      describe('and the cart exists', () => {
        let id: string
        let cart: ShoppingCart

        beforeEach(async () => {
          cart = new ShoppingCart()
          id = cart.id
          await repository.save(cart)
        })

        it('should delete the cart', async () => {
          expect(await repository.findById(id)).toBeDefined()
          await repository.remove(id)
          expect(await repository.findById(id)).toBeUndefined()
        })
      })
      describe('and the cart does not exist', () => {
        let id: string
        let cart: ShoppingCart
        let error: Error | undefined

        beforeEach(async () => {
          cart = new ShoppingCart()
          id = randomUUID()
          await repository.save(cart)
          await repository.remove(id).catch((err: Error) => error = err)
        })

        it('should not throw', async () => {
          expect(error).toBeUndefined()
        })
        it('should not remove anything', async () => {
          expect(await repository.getAll()).toHaveLength(1)
        })
      })
    })
    describe('when removing a list of carts', () => {
      describe('and an cart exists', () => {
        let id: string
        let cart: ShoppingCart

        beforeEach(async () => {
          cart = new ShoppingCart()
          id = cart.id
          await repository.save(cart)
        })

        it('should delete the cart', async () => {
          expect(await repository.findById(id)).toBeDefined()
          await repository.removeAll([id])
          expect(await repository.findById(id)).toBeUndefined()
        })
      })
      describe('and an cart does not exist', () => {
        let id: string
        let cart: ShoppingCart
        let error: Error | undefined

        beforeEach(async () => {
          cart = new ShoppingCart()
          id = randomUUID()
          await repository.save(cart)
          await repository.removeAll([id]).catch((err: Error) => error = err)
        })

        it('should not throw', async () => {
          expect(error).toBeUndefined()
        })
        it('should not remove anything', async () => {
          expect(await repository.getAll()).toHaveLength(1)
        })
      })
    })
  })
}

testShoppingCartRepository(new ShoppingCartRepositoryInMemory())
