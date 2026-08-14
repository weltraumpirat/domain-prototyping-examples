import odbc, { Connection, Statement } from 'odbc'
import {OrderRepository} from '../../domain/shopping-cart'
import {
  Order,
  UUID
} from '../../domain/types'
// This example uses IBM's node-odbc package, with prepared statements throughout.
//
// Example schema (works on any ANSI-SQL database reachable over ODBC):
//   CREATE TABLE orders (
//     id          CHAR(36) PRIMARY KEY,
//     customer_id CHAR(36) NOT NULL,
//     payload     TEXT     NOT NULL
//   );
//   CREATE INDEX orders_customer_id_idx ON orders (customer_id);
//
// In this example, 'payload' is a JSON-encoded string containing the order details,
// to keep things simple and readable.
// You would probably want to specify a more elaborate Order type, possibly using
// a 1-to-many relation with OrderItem, and have all their relevant
// business information in specifically typed fields.
//
// Exact type names vary by vendor (TEXT / CLOB / VARCHAR(MAX)); CHAR(36) holds
// a UUID string. Avoid vendor-specific types (e.g. PostgreSQL's UUID / JSONB)
// so the same DDL works against PostgreSQL, SQL Server, Oracle, DB2, ...
//
// Prepared statements are connection-scoped in ODBC, so this repository owns a
// single long-lived connection and prepares every statement once in connect().
// A pooled variant would re-prepare on every acquisition, but would gain
// concurrent use, failover, and reconnect on idle disconnect in turn.
// Because the connection and its statements are shared, bind() and execute()
// must not interleave: concurrent calls on one instance need external
// serialization (or the pooled variant).
//
// save() and saveAll() both use a vendor-agnostic DELETE-then-INSERT pattern —
// no ON CONFLICT (PostgreSQL), no MERGE (SQL Server / Oracle). For batch
// operations we prepare a multi-row INSERT and a multi-row DELETE at a fixed
// MAX_BATCH_SIZE; saveAll splits its input into full batches of that size
// plus a single-row tail. This keeps every SQL string fixed at prepare time —
// no per-call concatenation, no values ever flowing into the SQL.


const MAX_BATCH_SIZE = 25

interface Statements {
  findById: Statement
  findByCustomer: Statement
  findAll: Statement
  removeOne: Statement
  insertOne: Statement
  removeBatch: Statement
  insertBatch: Statement
}

async function prepareStatements(connection: Connection): Promise<Statements> {
  const prepare = async (sql: string): Promise<Statement> => {
    const statement = await connection.createStatement()
    await statement.prepare(sql)
    return statement
  }
  const idPlaceholders = Array(MAX_BATCH_SIZE).fill('?').join(', ')
  const rowPlaceholders = Array(MAX_BATCH_SIZE).fill('(?, ?, ?)').join(', ')
  return {
    findById:       await prepare('SELECT payload FROM orders WHERE id = ?'),
    findByCustomer: await prepare('SELECT payload FROM orders WHERE customer_id = ?'),
    findAll:        await prepare('SELECT payload FROM orders'),
    removeOne:      await prepare('DELETE FROM orders WHERE id = ?'),
    insertOne:      await prepare('INSERT INTO orders (id, customer_id, payload) VALUES (?, ?, ?)'),
    removeBatch:    await prepare(`DELETE FROM orders WHERE id IN (\${idPlaceholders})`),
    insertBatch:    await prepare(`INSERT INTO orders (id, customer_id, payload) VALUES \${rowPlaceholders}`),
  }
}

class OrderRepositoryOdbc implements OrderRepository {
  private constructor(
    private readonly _connection: Connection,
    private readonly _stmts: Statements,
  ) {
  }

  // Async setup (connect + prepare) suggests a factory method; the private
  // constructor makes it impossible to instantiate without prepared statements.
  static async connect(connectionString: string): Promise<OrderRepositoryOdbc> {
    const connection = await odbc.connect(connectionString)
    const stmts = await prepareStatements(connection)
    return new OrderRepositoryOdbc(connection, stmts)
  }

  async findAllByCustomerId(customerId: UUID): Promise<Order[]> {
    await this._stmts.findByCustomer.bind([customerId])
    const rows = await this._stmts.findByCustomer.execute<{ payload: string }>()
    return rows.map(row => JSON.parse(row.payload) as Order)
  }

  async findById(id: UUID): Promise<Order | undefined> {
    await this._stmts.findById.bind([id])
    const rows = await this._stmts.findById.execute<{ payload: string }>()
    if (rows.length === 0) return undefined
    return JSON.parse(rows[0].payload) as Order
  }
  async getById(id: UUID): Promise<Order> {
    const order = await this.findById(id)
    if (!order) {
      throw new Error('Order with id:' + id + ' not found.')
    }
    return order
  }
  async getAll(): Promise<Order[]> {
    const rows = await this._stmts.findAll.execute<{ payload: string }>()
    return rows.map(row => JSON.parse(row.payload) as Order)
  }

  async save(item: Order): Promise<void> {
    // DELETE-then-INSERT keeps semantics uniform with saveAll: always succeeds
    // whether or not the row already exists, no need for a separate UPDATE path.
    // Wrapped in a transaction so the DELETE and INSERT are atomic — a crash
    // between them can't leave the row deleted but not re-inserted.
    await this._connection.beginTransaction()
    try {
      await this._stmts.removeOne.bind([item.id])
      await this._stmts.removeOne.execute()
      await this._stmts.insertOne.bind([item.id, item.customerId, JSON.stringify(item)])
      await this._stmts.insertOne.execute()
      await this._connection.commit()
    } catch (error) {
      await this._connection.rollback()
      throw error
    }
  }
  async saveAll(items: Order[]): Promise<void> {
    if (items.length === 0) return
    // DELETE-then-INSERT in chunks of MAX_BATCH_SIZE rows. The batch prepared
    // statements have a fixed placeholder count, so full chunks go through them;
    // the tail (< MAX_BATCH_SIZE) drains via the single-row prepared statements.
    // No SQL is ever built at call time — every placeholder count is baked into
    // the statement at prepare time. Wrapped in a transaction so a partial
    // failure rolls everything back.
    await this._connection.beginTransaction()
    try {
      let offset = 0
      while (offset + MAX_BATCH_SIZE <= items.length) {
        const chunk = items.slice(offset, offset + MAX_BATCH_SIZE)
        const ids = chunk.map(item => item.id)
        const values = chunk.flatMap(item => [item.id, item.customerId, JSON.stringify(item)])
        await this._stmts.removeBatch.bind(ids)
        await this._stmts.removeBatch.execute()
        await this._stmts.insertBatch.bind(values)
        await this._stmts.insertBatch.execute()
        offset += MAX_BATCH_SIZE
      }
      for (let i = offset; i < items.length; i++) {
        const item = items[i]
        await this._stmts.removeOne.bind([item.id])
        await this._stmts.removeOne.execute()
        await this._stmts.insertOne.bind([item.id, item.customerId, JSON.stringify(item)])
        await this._stmts.insertOne.execute()
      }
      await this._connection.commit()
    } catch (error) {
      await this._connection.rollback()
      throw error
    }
  }
  async remove(id: UUID): Promise<void> {
    await this._stmts.removeOne.bind([id])
    await this._stmts.removeOne.execute()
  }
  async removeAll(ids: UUID[]): Promise<void> {
    if (ids.length === 0) return
    // Single DELETE per chunk via the prepared batch statement; tail drained
    // via the single-row prepared statement. Transaction makes the whole
    // operation atomic across chunks.
    await this._connection.beginTransaction()
    try {
      let offset = 0
      while (offset + MAX_BATCH_SIZE <= ids.length) {
        const chunk = ids.slice(offset, offset + MAX_BATCH_SIZE)
        await this._stmts.removeBatch.bind(chunk)
        await this._stmts.removeBatch.execute()
        offset += MAX_BATCH_SIZE
      }
      for (let i = offset; i < ids.length; i++) {
        await this._stmts.removeOne.bind([ids[i]])
        await this._stmts.removeOne.execute()
      }
      await this._connection.commit()
    } catch (error) {
      await this._connection.rollback()
      throw error
    }
  }

  async close(): Promise<void> {
    // Close prepared statements before the connection that owns them.
    for (const statement of Object.values(this._stmts)) {
      await statement.close()
    }
    await this._connection.close()
  }
}
