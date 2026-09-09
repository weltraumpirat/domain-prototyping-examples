import {DomainEvent} from '../../components/messages'
import {Order} from './types'


export class OrderPlacedEvent extends DomainEvent<'ORDER_PLACED'> {
  static readonly type = 'ORDER_PLACED'
  readonly type = OrderPlacedEvent.type

  constructor(readonly order: Order) {
    super()
  }
}
