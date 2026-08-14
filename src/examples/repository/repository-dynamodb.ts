// Multi-row design:
// Order spans several rows in the same partition
// (PK = 'ORDER#{orderId}')

// customerId on every row enables single-query byCustomer lookup
import {
  Address,
  Amount,
  Currency,
  Order,
  Timestamp,
  UUID
} from '../../domain/types'
import {OrderRepository} from '../../domain/shopping-cart'
import {
  dynamoDBBatchDelete,
  dynamoDBBatchWrite,
  dynamoDBQuery,
  dynamoDBScan
} from '../../components/dynamodb'

type DDBOrderRow    = { PK: string, SK: string, customerId: UUID }
type OrderHeaderRow = DDBOrderRow & { id: UUID }
type MetadataRow    = DDBOrderRow & { timestamp: Timestamp, totalValue: Currency, invoiceAddress?: Address, deliveryAddress: Address }
type ItemRow        = DDBOrderRow & { id: UUID, productId: UUID, quantity: Amount, pricePerUnit: Currency }
type OrderRow       = OrderHeaderRow | MetadataRow | ItemRow

function toOrderRows(order: Order): OrderRow[] {
  const pk = 'ORDER#' + order.id
  const customerId = order.customerId
  return [
    { PK: pk, SK: 'ORDER',    customerId, id: order.id },
    { PK: pk, SK: 'METADATA', customerId, ...order.metadata },
    ...order.items.map(item => ({
      PK: pk, SK: 'ITEM#' + item.id, customerId, ...item,
    })),
  ]
}

function fromOrderRows(rows: OrderRow[]): Order {
  const header   = rows.find(r => r.SK === 'ORDER')           as OrderHeaderRow
  const metadata = rows.find(r => r.SK === 'METADATA')        as MetadataRow
  const items    = rows.filter(r => r.SK.startsWith('ITEM#')) as ItemRow[]
  return {
    id:         header.id,
    customerId: header.customerId,
    items:      items.map(({ PK, SK, customerId, ...item }) => item),
    metadata:   { timestamp: metadata.timestamp, totalValue: metadata.totalValue,
      invoiceAddress: metadata.invoiceAddress, deliveryAddress: metadata.deliveryAddress },
  }
}

function groupAndReconstruct(rows: OrderRow[]): Order[] {
  const byPK: Map<string, OrderRow[]> = new Map()
  for (const row of rows) {
    const partition = byPK.get(row.PK) ?? []
    partition.push(row)
    byPK.set(row.PK, partition)
  }
  return Array.from(byPK.values()).map(fromOrderRows)
}

export class OrderRepositoryDynamoDB implements OrderRepository {

  async findAllByCustomerId(customerId: UUID): Promise<Order[]> {
    // Every row of every Order carries customerId (denormalized), so the
    // byCustomer GSI returns all rows for every one of this customer's orders
    // in a single round trip. We group them by partition key and reconstruct
    // each aggregate.
    const rows = await dynamoDBQuery<OrderRow>({
      IndexName: 'byCustomer',
      KeyConditionExpression: 'customerId = :customerId',
      ExpressionAttributeValues: { ':customerId': customerId },
    })
    return groupAndReconstruct(rows)
  }

  async findById(id: UUID): Promise<Order | undefined> {
    const rows = await this._queryPartition(id)
    return rows.length === 0 ? undefined : fromOrderRows(rows)
  }

  async getById(id: UUID): Promise<Order> {
    const order = await this.findById(id)
    if (order === undefined) {
      throw new Error('Order with id:' + id + ' not found.')
    }
    return order
  }

  async getAll(): Promise<Order[]> {
    // The table holds only Order rows (header + metadata + items, one partition
    // per Order), so a Scan reads exactly what we want — no filter, no GSI.
    const rows = await dynamoDBScan<OrderRow>()
    return groupAndReconstruct(rows)
  }
  async save(item: Order): Promise<void> {
    const rows = toOrderRows(item)
    await this._reconcilePartitions(rows, [item.id])
    await dynamoDBBatchWrite(rows)
  }

  async saveAll(items: Order[]): Promise<void> {
    const rows = items.flatMap(toOrderRows)
    await this._reconcilePartitions(rows, items.map(i => i.id))
    await dynamoDBBatchWrite(rows)
  }
  async remove(id: UUID): Promise<void> {
    const rows = await this._queryPartition(id)
    if (rows.length === 0) return
    await dynamoDBBatchDelete(rows.map(({ PK, SK }) => ({ PK, SK })))
  }

  async removeAll(ids: UUID[]): Promise<void> {
    // Discover all row keys in parallel, then delete them in one batched call.
    const allRows = await Promise.all(ids.map(id => this._queryPartition(id)))
    const keys = allRows.flat().map(({ PK, SK }) => ({ PK, SK }))
    if (keys.length === 0) return
    await dynamoDBBatchDelete(keys)
  }

  private _queryPartition(id: UUID): Promise<OrderRow[]> {
    return dynamoDBQuery<OrderRow>({
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': 'ORDER#' + id },
    })
  }

  // Delete rows that are no longer part of the aggregate before writing the
  // current ones — otherwise an Order that shrank (an item removed) would
  // leave orphaned ITEM# rows behind, which findById would read back as stale
  // items. Reading each partition first is safe because a single aggregate is
  // never saved concurrently (the command handler serializes it), and the
  // subsequent Puts are idempotent on (PK, SK) under retry.
  private async _reconcilePartitions(newRows: OrderRow[], ids: UUID[]): Promise<void> {
    const liveByPK = new Map<string, Set<string>>()
    for (const r of newRows) {
      const set = liveByPK.get(r.PK) ?? new Set<string>()
      set.add(r.SK)
      liveByPK.set(r.PK, set)
    }
    const existing = (await Promise.all(ids.map(id => this._queryPartition(id)))).flat()
    const stale = existing
        .filter(r => !liveByPK.get(r.PK)?.has(r.SK))
        .map(({ PK, SK }) => ({ PK, SK }))
    if (stale.length > 0) await dynamoDBBatchDelete(stale)
  }
}
