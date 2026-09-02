import {
  Amount,
  Currency,
  Money,
  Timestamp,
  UUID
} from '../types'
import {randomUUID} from 'node:crypto'
import {
  InvalidInputException,
  InvalidStateException
} from '../errors/errors'
import {Timekeeper} from '../../components/timekeeper'

export enum ShoppingCartState {
  EMPTY = 'EMPTY',
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED'
}

export class ShoppingCart {
  private state: ShoppingCartState = ShoppingCartState.EMPTY

  constructor(readonly id: UUID = randomUUID(), readonly _items: Map<UUID, ShoppingCartItem> = new Map(), public total: Money = '0 EUR') {
  }

  get items(): ShoppingCartItem[] {
    return [...this._items.values()]
  }

  addItem(id: UUID, quantity: Amount, price: Money): AddItemResult {
    if (this.state===ShoppingCartState.CANCELLED) {
      throw new InvalidStateException('This cart has been cancelled and can no longer be modified.')
    } else if (this.state===ShoppingCartState.CHECKED_OUT) {
      throw new InvalidStateException('This cart has been checked out and can no longer be modified.')
    }
    const previousTotal = this.total
    const total = previousTotal.split(' ')
    const ppU = price.split(' ')
    if (total[1]!==ppU[1]) throw new InvalidInputException('Currency must match. This cart expects ' + total[1])

    if (this._items.size===0) {
      this.state = ShoppingCartState.ACTIVE
    }
    let existing: ShoppingCartItem | undefined = this._items.get(id)
    if (!existing) {
      this._items.set(id, {id: randomUUID(), productId: id, quantity, pricePerUnit: price})
    } else {
      existing.quantity += quantity
    }
    const newTotal: Money = `${(parseFloat(total[0]) + (quantity * parseFloat(ppU[0])))} ${total[1] as Currency}`
    this.total = newTotal

    return {
      cartId: this.id, productId: id, price, quantity, previousTotal, newTotal
    }
  }

  removeItem(id: UUID, quantity: Amount, price: Money): RemoveItemResult {
    console.log(this)
    if (this.state===ShoppingCartState.EMPTY) {
      throw new InvalidStateException('You cannot remove items from an empty cart.')
    } else if (this.state===ShoppingCartState.CANCELLED) {
      throw new InvalidStateException('This cart has been cancelled and can no longer be modified.')
    } else if (this.state===ShoppingCartState.CHECKED_OUT) {
      throw new InvalidStateException('This cart has been checked out and can no longer be modified.')
    }
    const previousTotal = this.total
    const total = previousTotal.split(' ')
    const ppU = price.split(' ')
    if (total[1]!==ppU[1]) throw new InvalidInputException('Currency must match. This cart expects ' + total[1])

    let existing: ShoppingCartItem | undefined = this._items.get(id)
    if (!existing) throw new InvalidStateException('You can only remove items contained in the shopping cart.')

    if (existing.quantity > quantity)
      existing.quantity -= quantity
    else if (existing.quantity===quantity) {
      this._items.delete(id)
    } else {
      throw new InvalidStateException('The number of items you are trying to remove is greater than what\'s in the shopping cart.')
    }
    if (this._items.size===0) {
      this.state = ShoppingCartState.EMPTY
    }
    const newTotal: Money = `${(parseFloat(total[0]) - (quantity * parseFloat(ppU[0])))} ${total[1] as Currency}`
    this.total = newTotal

    return {
      cartId: this.id, productId: id, quantity, previousTotal, newTotal
    }
  }

  checkOut(): CheckOutResult {
    if (this.state===ShoppingCartState.EMPTY) {
      throw new InvalidStateException('An empty cart cannot be checked out.')
    } else if (this.state===ShoppingCartState.CANCELLED) {
      throw new InvalidStateException('A previously cancelled cart cannot be checked out.')
    } else if (this.state===ShoppingCartState.CHECKED_OUT) {
      throw new InvalidStateException('This cart has already been checked out.')
    }
    this.state = ShoppingCartState.CHECKED_OUT
    return {date: Timekeeper.now(), items: this.items, total: this.total}
  }

  cancel(reason: CancellationReason): CancellationResult {
    if (this.state===ShoppingCartState.CHECKED_OUT) {
      throw new InvalidStateException('This cart has already been checked out and can no longer be cancelled.')
    } else if (this.state===ShoppingCartState.CANCELLED) {
      throw new InvalidStateException('This cart has already been cancelled.')
    }
    this.state = ShoppingCartState.CANCELLED
    return {
      date: Timekeeper.now(),
      items: this.items,
      reason,
      total: this.total
    }
  }
}

export interface ShoppingCartItem {
  id: UUID,
  productId: UUID,
  quantity: Amount,
  pricePerUnit: Money
}

export interface ShoppingCartContents {
  cartId: UUID,
  timestamp: Timestamp
  items: ShoppingCartItem[],
  total: Money
}

export interface AddItemResult {
  cartId: UUID,
  productId: UUID,
  quantity: Amount
  price: Money
  previousTotal: Money
  newTotal: Money
}

export interface RemoveItemResult {
  cartId: UUID,
  productId: UUID,
  quantity: Amount
  previousTotal: Money
  newTotal: Money
}

export interface CheckOutResult {
  date: Timestamp
  items: ShoppingCartItem[]
  total: Money
}

export type CancellationReason = 'FOUND_BETTER_PRICE' | 'CHANGED_MY_MIND' | 'NEED_MORE_TIME'

export interface CancellationResult {
  date: Timestamp
  items: ShoppingCartItem[]
  total: Money
  reason: CancellationReason
}
