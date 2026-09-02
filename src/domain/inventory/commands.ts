// noinspection JSUnusedGlobalSymbols

import {DomainCommand} from '../../components/messages'
import {
  Amount,
  UUID
} from '../types'

export class BlockItemInInventoryCommand extends DomainCommand<'BLOCK_ITEM_IN_INVENTORY'> {
  static readonly type = 'BLOCK_ITEM_IN_INVENTORY' as const
  override readonly type = BlockItemInInventoryCommand.type

  constructor(readonly itemId: UUID, readonly quantity: Amount) {
    super()
  }
}

export class UnblockItemInInventoryCommand extends DomainCommand<'UNBLOCK_ITEM_IN_INVENTORY'> {
  static readonly type = 'UNBLOCK_ITEM_IN_INVENTORY' as const
  override readonly type = UnblockItemInInventoryCommand.type

  constructor(readonly itemId: UUID, readonly quantity: Amount) {
    super()
  }
}

export class RemoveItemsFromInventoryCommand extends DomainCommand<'REMOVE_ITEMS_FROM_INVENTORY'> {
  static readonly type = 'REMOVE_ITEMS_FROM_INVENTORY' as const
  override readonly type = RemoveItemsFromInventoryCommand.type

  constructor(readonly items: { productId: UUID, quantity: Amount }[]) {
    super()
  }
}
