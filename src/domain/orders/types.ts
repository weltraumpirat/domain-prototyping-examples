import {
  Address,
  Amount,
  Money,
  Timestamp,
  UUID
} from '../types'

export type OrderItem = {
  id: UUID,
  productId: UUID,
  quantity: Amount,
  pricePerUnit: Money
}

export type OrderMetadata = {
  timestamp: Timestamp,
  totalValue: Money,
  invoiceAddress?: Address,
  deliveryAddress: Address
}

export type Order = {
  id: UUID,
  customerId: UUID,
  items: OrderItem[],
  metadata: OrderMetadata
}
