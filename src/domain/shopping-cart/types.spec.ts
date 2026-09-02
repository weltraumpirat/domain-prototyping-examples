import {
  ShoppingCart,
  ShoppingCartItem
} from './types'
import {randomUUID} from 'node:crypto'
import {UUID} from '../types'
import {InvalidStateException} from '../errors/errors'

describe('ShoppingCart:', () => {
  let cart: ShoppingCart
  const productId: UUID = randomUUID()
  beforeEach(() => {
    cart = new ShoppingCart()
  })

  describe('when an item is added', () => {
    describe('and the cart had been checked out before', () => {
      beforeEach(() => {
        cart.addItem(productId,1,'5 EUR')
        cart.checkOut()
      })

      it('should throw an error', () => {
        expect(()=> cart.addItem(productId, 1, '5 EUR')).toThrow(InvalidStateException)
      })
    })

    describe('and the cart had been cancelled before', () => {
      beforeEach(() => {
        cart.cancel('CHANGED_MY_MIND')
      })
      it('should throw an error', () => {
        expect(()=> cart.addItem(productId, 1, '5 EUR')).toThrow(InvalidStateException)
      })
    })

    describe('and the cart is empty', () => {
      beforeEach(() => {
        cart.addItem(productId, 1, '5 EUR')
      })
      it('should add the item', () => {
        let expected: ShoppingCartItem = {id: expect.any(String), productId, quantity: 1, pricePerUnit: '5 EUR'}
        expect(cart.items).toEqual([expected])
      })
      it('should calculate the total price', () => {
        expect(cart.total).toEqual('5 EUR')
      })
    })
    describe('and the cart already contains an item of the same kind and price', () => {
      beforeEach(() => {
        cart.addItem(productId, 1, '5 EUR')
        cart.addItem(productId, 1, '5 EUR')
      })

      it('should increase the item quantity', () => {
        let expected: ShoppingCartItem = {id: expect.any(String), productId, quantity: 2, pricePerUnit: '5 EUR'}
        expect(cart.items).toEqual([expected])
      })

      it('should calculate the new total price', () => {
        expect(cart.total).toEqual('10 EUR')
      })
    })
  })

  describe('when an item is removed', () => {
    describe('and the cart has been cancelled before', () => {
      beforeEach(() => {
        cart.cancel('CHANGED_MY_MIND')
      })
      it('should throw an error', () => {
        expect(()=> cart.removeItem(productId, 1, '5 EUR')).toThrow(InvalidStateException)
      })
    })
    describe('and the cart has been checked out before', () => {
      beforeEach(() => {
        cart.addItem(productId, 1, '5 EUR')
        cart.checkOut()
      })
      it('should throw an error', () => {
        expect(()=> cart.removeItem(productId, 1, '5 EUR')).toThrow(InvalidStateException)
      })
    })
    describe('and the cart is empty', () => {
      it('should throw an error', () => {
        expect(()=> cart.removeItem(productId, 1, '5 EUR')).toThrow(InvalidStateException)
      })
    })
    describe('and the cart contains less items than are being removed', () => {
      beforeEach(() => {
        cart.addItem(productId, 1, '5 EUR')
      })
      it('should throw an error', () => {
        expect(()=> cart.removeItem(productId, 2, '5 EUR')).toThrow(InvalidStateException)
      })
    })
    describe('and the cart contains more items than are being removed', () => {
      beforeEach(() => {
        cart.addItem(productId, 2, '5 EUR')
        cart.removeItem(productId, 1, '5 EUR')
      })
      it('should decrease the quantity', () => {
        let expected: ShoppingCartItem = {id: expect.any(String), productId, quantity: 1, pricePerUnit: '5 EUR'}
        expect(cart.items).toEqual([expected])
      })
      it('should calculate the new total price', () => {
        expect(cart.total).toEqual('5 EUR')
      })
    })
    describe('and the cart contains an item of the same kind, quantity, and price', () => {
      beforeEach(() => {
        cart.addItem(productId, 1, '5 EUR')
        cart.removeItem(productId, 1, '5 EUR')
      })

      it('should remove the item', () => {
        expect(cart.items).toEqual([])
      })

      it('should calculate the new total price', () => {
        expect(cart.total).toEqual('0 EUR')
      })
    })
  })

  describe('when cart is checked out', () => {
    describe('and cart had been checked out before', () => {
      beforeEach(() => {
        cart.addItem(productId,1, '5 EUR')
        cart.checkOut()
      })

      it('should throw an error', () => {
        expect(()=>cart.checkOut()).toThrow(InvalidStateException)
      })
    })

    describe('and cart had been cancelled before', () => {
      beforeEach(() => {
        cart.cancel('CHANGED_MY_MIND')
      })

      it('should throw an error', () => {
        expect(()=>cart.checkOut()).toThrow(InvalidStateException)
      })
    })

    describe('and cart is empty', () => {
      it('should throw an error', () => {
        expect(()=>cart.checkOut()).toThrow(InvalidStateException)
      })
    })
    describe('and cart is not empty', () => {
      it('should create an order', () => {

      })
    })
  })

  describe('when the cart is cancelled', () => {
    describe('and cart had been checked out before', () => {
      beforeEach(() => {
        cart.addItem(productId,1, '5 EUR')
        cart.checkOut()
      })

      it('should throw an error', () => {
        expect(()=>cart.cancel('CHANGED_MY_MIND')).toThrow(InvalidStateException)
      })
    })

    describe('and cart had been cancelled before', () => {
      beforeEach(() => {
        cart.cancel('CHANGED_MY_MIND')
      })

      it('should throw an error', () => {
        expect(()=>cart.cancel('CHANGED_MY_MIND')).toThrow(InvalidStateException)
      })
    })
    it('should return the cart\'s data, so that we can use it for analytics', () => {
        cart.addItem(productId,1, '5 EUR')
        const result = cart.cancel('CHANGED_MY_MIND')
        expect(result).toEqual({
          date: expect.any(String),
          items: [
            {
              id: expect.any(String),
              pricePerUnit: "5 EUR",
              productId,
              quantity: 1
            }
          ],
          reason: "CHANGED_MY_MIND",
          total: "5 EUR"
        })
    })
  })
})
