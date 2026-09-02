
// This results in the following complete repository interface:
// findAllByCustomerId(customerId: UUID) : Promise<Order[]>
// findById(id: UUID): Promise<Order | undefined>
// getById(id: UUID): Promise<Order>
// getAll(): Promise<Order[]>
//
// save(item: Order): Promise<void>
// saveAll(items: Order[]): Promise<void>
// remove(id: UUID): Promise<void>
// removeAll(ids?: UUID[]): Promise<void>
import {Order} from './types'
import {Repository} from '../../components/repository'
import {UUID} from '../types'

export interface OrderRepository extends Repository<Order> {
  findAllByCustomerId(customerId: UUID): Promise<Order[]>
}
