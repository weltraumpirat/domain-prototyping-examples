import {
  AccountNumber,
  Amount,
  Currency,
  UUID
} from '../types'
import {randomUUID} from 'node:crypto'

export interface TransactionOutcome {
  balanceBefore: Amount
  balanceAfter: Amount
}

export interface TransactionRejection {
  balanceBefore: Amount
  reason: string
}

export type TransactionResult = TransactionOutcome | TransactionRejection

export type Balance = {
  amount: Amount,
  currency: Currency
}

/**
 * This is a VERY naïve implementation of 'account'. It is intended for illustration
 * purposes ONLY, not as a template to use in your own domain.
 * It does a lot of things that you should never EVER do, first and formost: Calculate
 * money using floating point number types.
 *
 * Seriously: Don't use this! You've been warned.
 **/
export class Account {
  readonly id: UUID
  readonly accountNumber: AccountNumber
  constructor(private readonly balance: Balance = {amount: 0, currency: 'EUR'}) {
    this.id = randomUUID()
    this.accountNumber = String(Math.random() * 10000000000)
  }

  public deposit(amount: Amount, currency: Currency): TransactionResult {
    const balanceBefore = this.balance.amount
    if(currency === this.balance.currency) {
      this.balance.amount += amount
    } else {
      // currency converter is out of scope - reject non-matching
      return this.reject('Currency does not match')
    }
    return {
      balanceBefore,
      balanceAfter: this.balance.amount
    }
  }

  public withdrawFunds(amount: Amount, currency: Currency): TransactionResult {
    const balanceBefore = this.balance.amount
    if(currency === this.balance.currency) {
      if(this.balance.amount >= amount) {
        this.balance.amount -= amount
      } else {
        return this.reject('Insufficient funds.')
      }
    } else {
      // currency converter is out of scope - reject non-matching
      return this.reject('Currency does not match')
    }
    return {
      balanceBefore,
      balanceAfter: this.balance.amount
    }
  }

  private reject(reason: string): TransactionRejection {
    return {
      balanceBefore: this.balance.amount,
      reason
    }
  }

  public transfer(amount: Amount, currency: Currency, targetAccount: Account): TransactionResult {
    const balanceBefore = this.balance.amount
    if(currency === this.balance.currency) {
      if(this.balance.amount >= amount) {
        this.balance.amount -= amount
        targetAccount.deposit(amount, currency)
      } else {
        return this.reject('Insufficient funds.')
      }
    } else {
      // currency converter is out of scope - reject non-matching
      return this.reject('Currency does not match')
    }
    return {
      balanceBefore,
      balanceAfter: this.balance.amount
    }
  }
}
