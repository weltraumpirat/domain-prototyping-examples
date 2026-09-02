import {
  AccountRepository,
  AccountRepositoryInMemory
} from './repository'
import {Account} from './types'
import {randomUUID} from 'node:crypto'

function testAccountRepository(repository: AccountRepository) {
  afterEach(async () => {
    await repository.removeAll()
  })

  describe(repository.constructor.name + ':', () => {
    describe('when getting an account by ID', () => {
      describe('and the account exists', () => {
        let id: string
        let account: Account

        beforeEach(async () => {
          account = new Account()
          id = account.id
          await repository.save(account)
        })

        it('should return the account', async () => {
          expect(await repository.getById(id)).toEqual(account)
        })
      })
      describe('and the account does not exist', () => {
        let id: string
        let account: Account

        beforeEach(async () => {
          account = new Account()
          await repository.save(account)
          id = randomUUID()
        })

        it('should throw', async () => {
          let error: Error | undefined
          await repository.getById(id).catch((err: Error) => error = err)
          expect(error).toBeDefined()
        })
      })
    })

    describe('when finding an account by ID', () => {
      describe('and the account exists', () => {
        let id: string
        let account: Account

        beforeEach(async () => {
          account = new Account()
          id = account.id
          await repository.save(account)
        })

        it('should return the account', async () => {
          expect(await repository.findById(id)).toEqual(account)
        })
      })
      describe('and the account does not exist', () => {
        let id: string
        let account: Account

        beforeEach(async () => {
          account = new Account()
          await repository.save(account)
          id = randomUUID()
        })

        it('should return undefined', async () => {
          expect(await repository.findById(id)).toBeUndefined()
        })
      })
    })
    describe('when getting all accounts', () => {
      describe('and no accounts exist', () => {
        it('should return empty array', async () => {
          expect(await repository.getAll()).toEqual([])
        })
      })
      describe('and accounts exists', () => {
        let account: Account
        beforeEach(async () => {
          account = new Account()
          await repository.save(account)
        })

        it('should return list of accounts', async () => {
          expect(await repository.getAll()).toEqual([account])
        })
      })
    })

    describe('when adding an account', () => {
      beforeEach(async () => {
        expect(await repository.getAll()).toEqual([])
        await repository.save(new Account())
      })

      it('should retain the account', async () => {
        expect(await repository.getAll()).toHaveLength(1)
      })
    })
    describe('when adding a list of accounts', () => {
      beforeEach(async () => {
        expect(await repository.getAll()).toEqual([])
        await repository.saveAll([new Account(), new Account()])
      })

      it('should retain the accounts', async () => {
        expect(await repository.getAll()).toHaveLength(2)
      })
    })
    describe('when removing an account', () => {
      describe('and the account exists', () => {
        let id: string
        let account: Account

        beforeEach(async () => {
          account = new Account()
          id = account.id
          await repository.save(account)
        })

        it('should delete the account', async () => {
          expect(await repository.findById(id)).toBeDefined()
          await repository.remove(id)
          expect(await repository.findById(id)).toBeUndefined()
        })
      })
      describe('and the account does not exist', () => {
        let id: string
        let account: Account
        let error: Error | undefined

        beforeEach(async () => {
          account = new Account()
          id = randomUUID()
          await repository.save(account)
          await repository.remove(id).catch((err: Error) => error = err)
        })

        it('should not throw', async () => {
          expect(error).toBeUndefined()
        })
        it('should not remove anything', async () => {
          expect(await repository.getAll()).toHaveLength(1)
        })
      })
    })
    describe('when removing a list of accounts', () => {
      describe('and an account exists', () => {
        let id: string
        let account: Account

        beforeEach(async () => {
          account = new Account()
          id = account.id
          await repository.save(account)
        })

        it('should delete the account', async () => {
          expect(await repository.findById(id)).toBeDefined()
          await repository.removeAll([id])
          expect(await repository.findById(id)).toBeUndefined()
        })
      })
      describe('and an account does not exist', () => {
        let id: string
        let account: Account
        let error: Error | undefined

        beforeEach(async () => {
          account = new Account()
          id = randomUUID()
          await repository.save(account)
          await repository.removeAll([id]).catch((err: Error) => error = err)
        })

        it('should not throw', async () => {
          expect(error).toBeUndefined()
        })
        it('should not remove anything', async () => {
          expect(await repository.getAll()).toHaveLength(1)
        })
      })
    })
  })
}

testAccountRepository(new AccountRepositoryInMemory())
