// noinspection JSUnusedGlobalSymbols

import {DomainEvent} from '../../components/messages'
import {
  Amount,
  Money,
  UUID
} from '../types'
import {
  ShoppingCartContents,
  ShoppingCartItem
} from './types'
import {Timekeeper} from '../../components/timekeeper'

export class ItemAddedToCartEvent extends DomainEvent<'ITEM_ADDED_TO_CART'> {
  static readonly type = 'ITEM_ADDED_TO_CART' as const
  override readonly type = ItemAddedToCartEvent.type

  constructor(
      readonly cartId: UUID,
      readonly productId: UUID,
      readonly quantity: Amount,
      readonly price: Money,
      readonly previousTotal: Money,
      readonly newTotal: Money
  ) {
    super()
  }
}

export class ItemRemovedFromCartEvent extends DomainEvent<'ITEM_REMOVED_FROM_CART'> {
  static readonly type = 'ITEM_REMOVED_FROM_CART' as const
  override readonly type = ItemRemovedFromCartEvent.type

  constructor(
      readonly cartId: UUID,
      readonly productId: UUID,
      readonly quantity: Amount,
      readonly price: Money,
      readonly previousTotal: Money,
      readonly newTotal: Money
  ) {
    super()
  }
}

export class ShoppingCartCheckedOutEvent extends DomainEvent<'SHOPPING_CART_CHECKED_OUT'> {
  static readonly type = 'SHOPPING_CART_CHECKED_OUT' as const
  override readonly type = ShoppingCartCheckedOutEvent.type
  readonly cart: ShoppingCartContents

  constructor(cartId: UUID, items: ShoppingCartItem[], total: Money, timestamp = Timekeeper.now() ) {
    super()
    this.cart = { cartId, timestamp, items, total }
  }
}

export class AddItemFailedEvent extends DomainEvent<'ADD_ITEM_FAILED'> {
  static readonly type = 'ADD_ITEM_FAILED' as const
  override readonly type = AddItemFailedEvent.type

  constructor(readonly reason: string) {
    super()
  }
}



export class RemoveItemFailedEvent extends DomainEvent<'REMOVE_ITEM_FAILED'> {
  static readonly type = 'REMOVE_ITEM_FAILED' as const
  override readonly type = RemoveItemFailedEvent.type

  constructor(readonly reason: string) {
    super()
  }
}


export class CheckOutFailedEvent extends DomainEvent<'CHECKOUT_FAILED'> {
  static readonly type = 'CHECKOUT_FAILED' as const
  override readonly type = CheckOutFailedEvent.type

  constructor(readonly reason: string) {
    super()
  }
}
