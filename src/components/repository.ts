import {UUID} from '../domain/types'

export interface Repository<T> {
  findById(id: UUID): Promise<T | undefined>
  getById(id: UUID): Promise<T>
  getAll(): Promise<T[]>

  save(item: T): Promise<void>
  saveAll(items: T[]): Promise<void>
  remove(id: UUID): Promise<void>
  removeAll(ids?: UUID[]): Promise<void>
}
