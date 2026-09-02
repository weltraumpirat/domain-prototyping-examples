// noinspection JSUnusedGlobalSymbols

import {DomainCommand} from '../../components/messages'
import {
  AccountNumber,
  AccountUsageType,
  Amount,
  Currency,
  UUID
} from '../types'
import {randomUUID} from 'node:crypto'

export class CollectBonusPointsCommand extends DomainCommand<'COLLECT_BONUS_POINTS'> {
  readonly id: UUID = randomUUID()
  static readonly type = 'COLLECT_BONUS_POINTS' as const
  readonly type = CollectBonusPointsCommand.type

  constructor(readonly account: AccountNumber, readonly usageType: AccountUsageType, readonly amount: Amount, readonly currency: Currency) {
    super()
  }
}
