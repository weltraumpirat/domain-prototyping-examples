import {CommandQueue} from '../../components/message-queue'
import {
  Amount,
  UUID
} from '../types'
import {
  BlockItemInInventoryCommand,
  RemoveItemsFromInventoryCommand,
  UnblockItemInInventoryCommand
} from './commands'
import {DomainMessage} from '../../components/messages'
import {
  ItemAddedToCartEvent,
  ItemRemovedFromCartEvent,
  ShoppingCartCheckedOutEvent,

} from '../shopping-cart/events'

export const createWhenItemAddedToCart_blockItemInInventory = (inventoryCommandQueue: CommandQueue) =>
    async (event: ItemAddedToCartEvent): Promise<void> => {
      await inventoryCommandQueue.add(
          new BlockItemInInventoryCommand(event.productId, event.quantity))
    }
export const createWhenItemRemovedFromCart_unblockItemInInventory = (inventoryCommandQueue: CommandQueue) =>
    async (event: ItemRemovedFromCartEvent) => {
      await inventoryCommandQueue.add(
          new UnblockItemInInventoryCommand(event.productId, event.quantity)
      )
    }
export const createWhenOrderPlaced_removeItemsFromInventory = (inventoryCommandQueue: CommandQueue) =>
    async (event: ShoppingCartCheckedOutEvent) => {
      const items: { productId: UUID; quantity: Amount }[] =
          event.cart.items.map(i => ({productId: i.productId, quantity: i.quantity}))
      await inventoryCommandQueue.add(new RemoveItemsFromInventoryCommand(items))
    }

// In DDD, a policy decides when to act upon incoming domain events.
// We group individual handlers by their intended purpose.
export class InventoryPolicy {
  private readonly whenItemAddedToCart_blockItemInInventory: (event: ItemAddedToCartEvent) => Promise<void>
  private readonly whenItemRemovedFromCart_unblockItemInInventory: (event: ItemRemovedFromCartEvent) => Promise<void>
  private readonly whenCartIsCheckedOut_removeItemsFromInventory: (event: ShoppingCartCheckedOutEvent) => Promise<void>

  constructor(inventoryCommandQueue: CommandQueue) {
    this.whenItemAddedToCart_blockItemInInventory =
        createWhenItemAddedToCart_blockItemInInventory(inventoryCommandQueue)
    this.whenItemRemovedFromCart_unblockItemInInventory =
        createWhenItemRemovedFromCart_unblockItemInInventory(inventoryCommandQueue)
    this.whenCartIsCheckedOut_removeItemsFromInventory =
        createWhenOrderPlaced_removeItemsFromInventory(inventoryCommandQueue)
  }

  async handle<T extends DomainMessage>(evt: T): Promise<void> {
    if (evt instanceof ItemAddedToCartEvent) {
      await this.whenItemAddedToCart_blockItemInInventory(evt)
    } else if (evt instanceof ItemRemovedFromCartEvent) {
      await this.whenItemRemovedFromCart_unblockItemInInventory(evt)
    } else if (evt instanceof ShoppingCartCheckedOutEvent) {
      await this.whenCartIsCheckedOut_removeItemsFromInventory(evt)
    }
  }
}
