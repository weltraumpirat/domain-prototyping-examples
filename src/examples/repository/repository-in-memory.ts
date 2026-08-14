import {OrderRepository} from '../../domain/shopping-cart'
import {
  Order,
  UUID
} from '../../domain/types'

export class OrderRepositoryInMemory implements OrderRepository {
  private _orders: Map<UUID, Order> = new Map<UUID, Order>()

  constructor( orders?: Order[] ) {  // optional constructor parameter to initialize with setup data
    if(orders) this._orders = new Map(orders.map(order => [order.id, order]))
  }

  async findAllByCustomerId(customerId: UUID): Promise<Order[]> {
    return (await this.getAll())
        .filter(item => item.customerId === customerId)
  }

  async findById(id: UUID): Promise<Order | undefined> {
    return this._orders.get(id)
  }
  async getById(id: UUID): Promise<Order> {
    const order = this._orders.get(id)
    if(!order) {
      throw new Error('Order with id:'+id+' not found.')
    }
    return order
  }
  async getAll(): Promise<Order[]> {
    return [...this._orders.values()]
  }

  async save(item: Order): Promise<void> {
    this._orders.set(item.id, item)
  }
  async saveAll(items: Order[]): Promise<void> {
    items.forEach(item => this._orders.set(item.id, item))
  }
  async remove(id: UUID): Promise<void> {
    this._orders.delete(id)
  }
  async removeAll(ids: UUID[]): Promise<void> {
    ids.forEach(id => this._orders.delete(id))
  }
}
