// We use the same DomainMessage, DomainCommand and DomainEvent definitions also used with Eventbus

export declare type Timestamp = {}
export declare type Address = {}
export type UUID = string
export type AccountNumber = string
export type AccountUsageType = 'WITHDRAWAL' | 'DEPOSIT' | 'TRANSFER'
export type Amount = number
export type Currency = 'EUR' | 'USD' | 'GBP'
export type Money = `${Amount} ${Currency}`
