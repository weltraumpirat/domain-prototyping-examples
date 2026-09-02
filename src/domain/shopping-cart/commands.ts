import {DomainCommand} from '../../components/messages'
import {
  Amount,
  Money,
  UUID
} from '../types'

export class AddItemToCartCommand extends DomainCommand<'ADD_ITEM_TO_CART'> {
  static readonly type = 'ADD_ITEM_TO_CART' as const
  readonly type = AddItemToCartCommand.type

  constructor(
      readonly cartId: UUID,
      readonly productId: UUID,
      readonly quantity: Amount,
      readonly price: Money
  ) {
    super()
  }
}

export class RemoveItemFromCartCommand extends DomainCommand<'REMOVE_ITEM_FROM_CART'> {
  static readonly type = 'REMOVE_ITEM_FROM_CART' as const
  override readonly type = RemoveItemFromCartCommand.type

  constructor(
      readonly cartId: UUID,
      readonly productId: UUID,
      readonly quantity: Amount,
      readonly price: Money
  ) {
    super()
  }
}


export class CheckOutShoppingCartCommand extends DomainCommand<'CHECK_OUT_SHOPPING_CART'> {
  static readonly type = 'CHECK_OUT_SHOPPING_CART' as const
  override readonly type = CheckOutShoppingCartCommand.type

  constructor(readonly cartId: UUID) {
    super()
  }
}
