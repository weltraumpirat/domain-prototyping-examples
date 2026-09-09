import {
  DomainCommand,
} from '../../components/messages'
import {UUID} from '../types'

export class PlaceOrderCommand extends DomainCommand<'ORDER_PLACED'> {
  static readonly type = 'ORDER_PLACED' as const
  readonly type = PlaceOrderCommand.type

  constructor(readonly cartId: UUID, readonly customerId: UUID ) {
    super()
  }
}
