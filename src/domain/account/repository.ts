import {Account} from './types'
import {Repository} from '../../components/repository'
import {UUID} from '../types'
import {NotFoundException} from '../errors/errors'

export interface AccountRepository extends Repository<Account> {
}

export class AccountRepositoryInMemory implements AccountRepository {
  constructor(private readonly accounts: Map<UUID, Account> = new Map<UUID, Account>()) {
  }

  public async findById(id: UUID): Promise<Account | undefined> {
    return this.accounts.get(id)
  }

  public async getAll(): Promise<Account[]> {
    return [...this.accounts.values()]
  }

  public async getById(id: UUID): Promise<Account> {
    const account = this.accounts.get(id)
    if (!account) {
      throw new NotFoundException('An account with id ' + id + ' does not exist.')
    }
    return account
  }

  public async remove(id: UUID): Promise<void> {
    // Ignores non-existing IDs
    this.accounts.delete(id)
  }

  public async removeAll(ids?: UUID[]): Promise<void> {
    if (ids) ids.forEach(id => this.remove(id))
    else this.accounts.clear()
  }

  public async save(item: Account): Promise<void> {
    this.accounts.set(item.id, item)
  }

  public async saveAll(items: Account[]): Promise<void> {
    items.forEach(item => this.save(item))
  }

}


