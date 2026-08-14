import {
  DomainCommand,
  DomainEvent,
} from '../components/messages'
import {
  Amount,
  Currency,
  OrderItem,
  OrderMetadata,
  UUID
} from './types'
import {Order as IOrder} from './types'
import {Eventbus} from '../components/eventbus'
import {Repository} from '../components/repository'
import {CommandHandler} from '../components/message-handler'

declare class Order implements IOrder {
  id: string
  customerId: string
  items: OrderItem[]
  metadata: OrderMetadata
  static fromCart(cart: ShoppingCart): Order
}

export interface ShoppingCart {
  addItem(id: UUID, quantity: Amount, price: Currency): Promise<AddItemResult>
}

export interface ShoppingCartRepository {
  findById(id: UUID): Promise<ShoppingCart>
}

export class AddItemToCartCommand extends DomainCommand<'ADD_ITEM_TO_CART'> {
  static readonly type = 'ADD_ITEM_TO_CART' as const
  readonly type = AddItemToCartCommand.type

  constructor(
      readonly cartId: UUID,
      readonly productId: UUID,
      readonly quantity: Amount,
      readonly price: Currency
  ) {
    super()
  }
}

export class ItemAddedToCartEvent extends DomainEvent<'ITEM_ADDED_TO_CART'> {
  static readonly type = 'ITEM_ADDED_TO_CART' as const
  override readonly type = ItemAddedToCartEvent.type

  constructor(
      readonly cartId: UUID,
      readonly productId: UUID,
      readonly quantity: Amount,
      readonly price: Currency,
      readonly previousTotal: Currency,
      readonly newTotal: Currency
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
      readonly price: Currency,
      readonly previousTotal: Currency,
      readonly newTotal: Currency
  ) {
    super()
  }
}

export declare interface AddItemResult {
  cartId: UUID,
  productId: UUID,
  quantity: Amount
  price: Currency
  previousTotal: Currency
  newTotal: Currency
}

export class PlaceOrderCommand extends DomainCommand<'PLACE_ORDER'> {
  static readonly type = 'PLACE_ORDER' as const
  override readonly type = PlaceOrderCommand.type

  constructor(readonly cartId: UUID) {
    super()
  }
}


// This results in the following complete repository interface:
// findAllByCustomerId(customerId: UUID) : Promise<Order[]>
// findById(id: UUID): Promise<Order | undefined>
// getById(id: UUID): Promise<Order>
// getAll(): Promise<Order[]>
//
// save(item: Order): Promise<void>
// saveAll(items: Order[]): Promise<void>
// remove(id: UUID): Promise<void>
// removeAll(ids: UUID[]): Promise<void>

export interface OrderRepository extends Repository<Order> {
  findAllByCustomerId(customerId: UUID) : Promise<Order[]>
}

export class OrderPlacedEvent extends DomainEvent<'ORDER_PLACED'> {
  static readonly type = 'ORDER_PLACED' as const
  override readonly type = OrderPlacedEvent.type

  constructor(readonly order: Order) {
    super()
  }
}

export const createAddItemToCartHandler =
    (repository: ShoppingCartRepository, eventbus: Eventbus) =>
        async (cmd: DomainCommand): Promise<void> => {
          const command: AddItemToCartCommand = cmd as AddItemToCartCommand
          const cart = await repository.findById(command.cartId)
          // At this point, we might also want to check availability, maximum Order capacity, etc.
          // Perhaps that requires more dependencies, such as read models, services, ...
          const result = await cart.addItem(command.productId, command.quantity, command.price)
          const event: ItemAddedToCartEvent = new ItemAddedToCartEvent(
              command.cartId,
              command.productId,
              command.quantity,
              command.price,
              result.previousTotal,
              result.newTotal)
          await eventbus.publish(event)
        }

export const createPlaceOrderHandler =
  (repository: ShoppingCartRepository, eventbus: Eventbus) =>
    async (msg: PlaceOrderCommand): Promise<void> => {
      const cart = await repository.findById(msg.cartId)
      const order = Order.fromCart(cart)
      await eventbus.publish(new OrderPlacedEvent(order))
}


// In DDD, commands can be given to aggregates or services. We group them by their target object.
export class ShoppingCartCommandHandlersQueue {
  private readonly handlePlaceOrder: CommandHandler<PlaceOrderCommand>
  private readonly handleAddItem: CommandHandler<AddItemToCartCommand>

  constructor(readonly repository: ShoppingCartRepository, readonly bus: Eventbus) {
    this.handlePlaceOrder = createPlaceOrderHandler(repository, bus)
    this.handleAddItem = createAddItemToCartHandler(repository, bus)
  }
  async handle<T extends DomainCommand>(cmd: T): Promise<void> {
    if(cmd instanceof PlaceOrderCommand) {
      await this.handlePlaceOrder(cmd)
    } else if(cmd instanceof AddItemToCartCommand) {
      await this.handleAddItem(cmd)
    }
  }
}


// In DDD, commands can be given to aggregates or services. We group them by their target object.
export class ShoppingCartCommandHandlersEventbus {
  constructor(readonly repository: ShoppingCartRepository, readonly bus: Eventbus) {
    bus.subscribe(PlaceOrderCommand, createPlaceOrderHandler(repository, bus))
  }
}

