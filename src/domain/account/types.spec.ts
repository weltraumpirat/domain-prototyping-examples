import {
  Account,
  TransactionOutcome,
  TransactionRejection,
  TransactionResult
} from './types'
import {Currency} from '../types'

describe('Account:', () => {
  let account: Account
  beforeEach(() => {
    account = new Account()
  })
  describe('when depositing money', () => {
    let currency: Currency = 'EUR'
    describe('and the currency matches', () => {
      let result: TransactionOutcome
      beforeEach(() => {
        result = account.deposit(10, currency) as TransactionOutcome
      })
      it('should add the amount to the account balance', () => {
        expect(result.balanceBefore).toEqual(0)
        expect(result.balanceAfter).toEqual(10)
      })
    })
    describe('and the currency does not match', () => {
      let result: TransactionRejection
      beforeEach(() => {
        result = account.deposit(10, 'USD') as TransactionRejection
      })
      it('should reject the transaction', () => {
        expect(result.balanceBefore).toEqual(0)
        expect(result.reason).toEqual('Currency does not match')
      })
    })
  })
  describe('when withdrawing money', () => {
    let currency: Currency = 'EUR'
    describe('and the currency matches', () => {
      let result: TransactionResult
      describe('and the account has sufficient funds', () => {
        beforeEach(() => {
          account.deposit(10, currency)
          result = account.withdrawFunds(10, currency)
        })
        it('should remove the amount from the account balance', () => {
          const res = result as TransactionOutcome
          expect(res.balanceBefore).toEqual(10)
          expect(res.balanceAfter).toEqual(0)
        })
      })
      describe('and the account does not have sufficient funds', () => {
        beforeEach(() => {
          result = account.withdrawFunds(10, currency)
        })
        it('should reject the transaction', () => {
          const res = result as TransactionRejection
          expect(res.balanceBefore).toEqual(0)
          expect(res.reason).toEqual('Insufficient funds.')
        })
      })
    })
    describe('and the currency does not match', () => {
      let result: TransactionRejection
      beforeEach(() => {
        result = account.withdrawFunds(10, 'USD') as TransactionRejection
      })
      it('should reject the transaction', () => {
        expect(result.balanceBefore).toEqual(0)
        expect(result.reason).toEqual('Currency does not match')
      })
    })
  })
  describe('when transferring money', () => {
    let currency: Currency = 'EUR'
    let targetAccount: Account
    beforeEach(() => {
      targetAccount = new Account()
    })
    describe('and the currency matches', () => {
      let result: TransactionResult
      describe('and the account has sufficient funds', () => {
        beforeEach(() => {
          account.deposit(10, currency)
          result = account.transfer(10, currency, targetAccount)
        })
        it('should remove the amount from the origin account\'s balance', () => {
          const res = result as TransactionOutcome
          expect(res.balanceBefore).toEqual(10)
          expect(res.balanceAfter).toEqual(0)
        })
        it('should add the amount to the target account\'s balance', () => {
          // @ts-ignore
          expect(targetAccount.balance.amount).toEqual(10)
        })
      })
      describe('and the account does not have sufficient funds', () => {
        beforeEach(() => {
          result = account.transfer(10, currency, targetAccount)
        })
        it('should reject the transaction', () => {
          const res = result as TransactionRejection
          expect(res.balanceBefore).toEqual(0)
          expect(res.reason).toEqual('Insufficient funds.')
        })
      })
    })
    describe('and the currency does not match', () => {
      let result: TransactionRejection
      beforeEach(() => {
        result = account.transfer(10, 'USD', targetAccount) as TransactionRejection
      })
      it('should reject the transaction', () => {
        expect(result.balanceBefore).toEqual(0)
        expect(result.reason).toEqual('Currency does not match')
      })
    })
  })
})
