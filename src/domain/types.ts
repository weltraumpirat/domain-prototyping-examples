// We use the same DomainMessage, DomainCommand and DomainEvent definitions also used with Eventbus


export declare type Timestamp = {}
export declare type Address = {}
export type UUID = string
export type AccountNumber = string
export type AccountUsageType = 'WITHDRAWAL' | 'DEPOSIT' | 'TRANSFER'
export type Amount = number
export type Currency = 'EUR' | 'USD' | 'GBP'

export type OrderItem = {
  id: UUID,
  productId: UUID,
  quantity: Amount,
  pricePerUnit: Currency
}

export type OrderMetadata = {
  timestamp: Timestamp,
  totalValue: Currency,
  invoiceAddress?: Address,
  deliveryAddress: Address
}

export type Order = {
  id: UUID,
  customerId: UUID,
  items: OrderItem[],
  metadata: OrderMetadata
}


