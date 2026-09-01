import {
  ItemAddedToCartEvent,
  ItemRemovedFromCartEvent,
  OrderPlacedEvent
} from './shopping-cart'
import {
  DomainCommand,
  DomainMessage
} from '../components/messages'
import {
  Amount,
  UUID
} from './types'
import {CommandQueue} from '../components/message-queue'

export class BlockItemInInventoryCommand extends DomainCommand<'BLOCK_ITEM_IN_INVENTORY'> {
  static readonly type = 'BLOCK_ITEM_IN_INVENTORY' as const
  override readonly type = BlockItemInInventoryCommand.type

  constructor(readonly itemId: UUID, readonly quantity: Amount) {
    super()
  }
}

export const createWhenItemAddedToCart_blockItemInInventory = (inventoryCommandQueue: CommandQueue) =>
    async (event: ItemAddedToCartEvent): Promise<void> => {
      await inventoryCommandQueue.add(
          new BlockItemInInventoryCommand(event.productId, event.quantity))
    }

export class UnblockItemInInventoryCommand extends DomainCommand<'UNBLOCK_ITEM_IN_INVENTORY'> {
  static readonly type = 'UNBLOCK_ITEM_IN_INVENTORY' as const
  override readonly type = UnblockItemInInventoryCommand.type
  constructor(readonly itemId: UUID, readonly quantity: Amount) {
    super()
  }
}

export const createWhenItemRemovedFromCart_unblockItemInInventory = (inventoryCommandQueue: CommandQueue) =>
    async(event: ItemRemovedFromCartEvent) => {
      await inventoryCommandQueue.add(
          new UnblockItemInInventoryCommand(event.productId, event.quantity)
      )
    }

export class RemoveItemsFromInventoryCommand extends DomainCommand<'REMOVE_ITEMS_FROM_INVENTORY'> {
  static readonly type = 'REMOVE_ITEMS_FROM_INVENTORY' as const
  override readonly type = RemoveItemsFromInventoryCommand.type
  constructor(readonly items: {productId: UUID, quantity: Amount}[]) {
    super()
  }
}

export const createWhenOrderPlaced_removeItemsFromInventory = (inventoryCommandQueue: CommandQueue) =>
    async(event: OrderPlacedEvent) => {
      const items: { productId: UUID; quantity: Amount }[] =
          event.order.items.map(i => ({productId: i.productId, quantity: i.quantity}))
      await inventoryCommandQueue.add(new RemoveItemsFromInventoryCommand(items))
    }

// In DDD, a policy decides when to act upon incoming domain events.
// We group individual handlers by their intended purpose.
export class InventoryPolicy {
  private readonly whenItemAddedToCart_blockItemInInventory: (event: ItemAddedToCartEvent) => Promise<void>
  private whenItemRemovedFromCart_unblockItemInInventory: (event: ItemRemovedFromCartEvent) => Promise<void>
  private whenOrderPlaced_removeItemsFromInventory: (event: OrderPlacedEvent) => Promise<void>

  constructor(inventoryCommandQueue: CommandQueue) {
    this.whenItemAddedToCart_blockItemInInventory =
        createWhenItemAddedToCart_blockItemInInventory(inventoryCommandQueue)
    this.whenItemRemovedFromCart_unblockItemInInventory =
        createWhenItemRemovedFromCart_unblockItemInInventory(inventoryCommandQueue)
    this.whenOrderPlaced_removeItemsFromInventory =
        createWhenOrderPlaced_removeItemsFromInventory(inventoryCommandQueue)
  }

  async handle<T extends DomainMessage>(evt: T): Promise<void> {
    if (evt instanceof ItemAddedToCartEvent) {
      await this.whenItemAddedToCart_blockItemInInventory(evt)
    } else if (evt instanceof ItemRemovedFromCartEvent) {
      await this.whenItemRemovedFromCart_unblockItemInInventory(evt)
    } else if (evt instanceof OrderPlacedEvent) {
      await this.whenOrderPlaced_removeItemsFromInventory(evt)
    }
  }
}
