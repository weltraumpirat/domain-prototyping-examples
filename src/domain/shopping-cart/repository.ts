import {Repository} from '../../components/repository'
import {
  ShoppingCart
} from './types'
import {UUID} from '../types'
import {NotFoundException} from '../errors/errors'

export interface ShoppingCartRepository extends Repository<ShoppingCart> {
}

export class ShoppingCartRepositoryInMemory implements ShoppingCartRepository {
  constructor(private readonly carts: Map<UUID, ShoppingCart> = new Map()) {
  }

  public async findById(id: UUID): Promise<ShoppingCart | undefined> {
    return this.carts.get(id)
  }

  public async getAll(): Promise<ShoppingCart[]> {
    return [...this.carts.values()]
  }

  public async getById(id: UUID): Promise<ShoppingCart> {
    const cart = await this.findById(id)
    if (cart===undefined) {
      throw new NotFoundException('A shopping cart with id ' + id + ' does not exist.')
    } else
      return cart
  }

  public async remove(id: UUID): Promise<void> {
    // Ignores non-existing IDs
    this.carts.delete(id)
  }

  public async removeAll(ids?: UUID[]): Promise<void> {
    if (ids) ids.forEach(id => this.carts.delete(id))
    else this.carts.clear()
  }

  public async save(item: ShoppingCart): Promise<void> {
    this.carts.set(item.id, item)
  }

  public async saveAll(items: ShoppingCart[]): Promise<void> {
    items.forEach(item => this.save(item))
  }
}
