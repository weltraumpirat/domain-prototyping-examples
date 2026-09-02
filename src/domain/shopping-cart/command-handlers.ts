import {ShoppingCartRepository} from './repository'
import {Eventbus} from '../../components/eventbus'
import {
  AddItemToCartCommand,
  CheckOutShoppingCartCommand,
  RemoveItemFromCartCommand
} from './commands'
import {
  AddItemFailedEvent,
  CheckOutFailedEvent,
  ItemAddedToCartEvent,
  ItemRemovedFromCartEvent,
  RemoveItemFailedEvent,
  ShoppingCartCheckedOutEvent
} from './events'
import {DomainCommand} from '../../components/messages'
import {CommandHandler} from '../../components/message-handler'
import {InvalidStateException} from '../errors/errors'

export const createAddItemToCartHandler =
    (repository: ShoppingCartRepository, eventbus: Eventbus) =>
        async (cmd: DomainCommand): Promise<void> => {
          const command: AddItemToCartCommand = cmd as AddItemToCartCommand
          const cart = await repository.getById(command.cartId)
          // At this point, we might also want to check availability, maximum Order capacity, etc.
          // Perhaps that requires more dependencies, such as read models, services, ...
          try {
            const result = cart.addItem(command.productId, command.quantity, command.price)
            const event: ItemAddedToCartEvent = new ItemAddedToCartEvent(
                command.cartId,
                command.productId,
                command.quantity,
                command.price,
                result.previousTotal,
                result.newTotal)
            await eventbus.publish(event)
          } catch (e: unknown) {
            if (e instanceof InvalidStateException) {
              const errorEvent: AddItemFailedEvent = new AddItemFailedEvent((e as InvalidStateException).message)
              await eventbus.publish(errorEvent)
            }
          }
        }

export const createRemoveItemFromCartHandler =
    (repository: ShoppingCartRepository, eventbus: Eventbus) =>
        async (cmd: DomainCommand): Promise<void> => {
          const command: RemoveItemFromCartCommand = cmd as RemoveItemFromCartCommand
          const cart = await repository.getById(command.cartId)
          // At this point, we might also want to check availability, maximum Order capacity, etc.
          // Perhaps that requires more dependencies, such as read models, services, ...
          try {
            const result = cart.removeItem(command.productId, command.quantity, command.price)
            const event: ItemRemovedFromCartEvent = new ItemRemovedFromCartEvent(
                command.cartId,
                command.productId,
                command.quantity,
                command.price,
                result.previousTotal,
                result.newTotal)
            await eventbus.publish(event)
          } catch (e: unknown) {
            if (e instanceof InvalidStateException) {
              const event: RemoveItemFailedEvent = new RemoveItemFailedEvent((e as InvalidStateException).message)
              await eventbus.publish(event)
            }
          }
        }

export const createCheckOutShoppingCartHandler =
    (repository: ShoppingCartRepository, eventbus: Eventbus) =>
        async (msg: CheckOutShoppingCartCommand): Promise<void> => {
          const cart = await repository.getById(msg.cartId)
          try {
            cart.checkOut()
            const event: ShoppingCartCheckedOutEvent = new ShoppingCartCheckedOutEvent(cart.id, cart.items, cart.total)
            await eventbus.publish(event)
          } catch (e: unknown) {
            if (e instanceof InvalidStateException) {
              const event: CheckOutFailedEvent = new CheckOutFailedEvent((e as InvalidStateException).message)
              await eventbus.publish(event)
            }
          }
        }

// In DDD, commands can be given to aggregates or services. We group them by their target object.
export class ShoppingCartCommandHandlersQueue {
  private readonly handleCheckOut: CommandHandler<CheckOutShoppingCartCommand>
  private readonly handleAddItem: CommandHandler<AddItemToCartCommand>
  private readonly handleRemoveItem: CommandHandler<RemoveItemFromCartCommand>

  constructor(readonly repository: ShoppingCartRepository, readonly eventbus: Eventbus) {
    this.handleCheckOut = createCheckOutShoppingCartHandler(repository, eventbus)
    this.handleAddItem = createAddItemToCartHandler(repository, eventbus)
    this.handleRemoveItem = createRemoveItemFromCartHandler(repository, eventbus)
  }

  async handle<T extends DomainCommand>(cmd: T): Promise<void> {
    if (cmd instanceof CheckOutShoppingCartCommand) {
      await this.handleCheckOut(cmd)
    } else if (cmd instanceof AddItemToCartCommand) {
      await this.handleAddItem(cmd)
    } else if (cmd instanceof RemoveItemFromCartCommand) {
      await this.handleRemoveItem(cmd)
    }
  }
}

// In DDD, commands can be given to aggregates or services. We group them by their target object.
export class ShoppingCartCommandHandlersEventbus {
  constructor(readonly repository: ShoppingCartRepository, readonly eventbus: Eventbus) {
    eventbus.subscribe(CheckOutShoppingCartCommand, createCheckOutShoppingCartHandler(repository, eventbus))
    eventbus.subscribe(AddItemToCartCommand, createAddItemToCartHandler(repository, eventbus))
    eventbus.subscribe(RemoveItemFromCartCommand, createRemoveItemFromCartHandler(repository, eventbus))
  }
}
