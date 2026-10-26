import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Db = PostgresJsDatabase<typeof schema>

export interface DbHandle {
  readonly db: Db
  close(): Promise<void>
}

/**
 * One client per request: Workers cannot share sockets across requests, and Hyperdrive
 * does the pooling. `prepare: false` and `fetch_types: false` avoid extra round trips.
 */
export function createDb(hyperdrive: Hyperdrive): DbHandle {
  const sql = postgres(hyperdrive.connectionString, { max: 1, prepare: false, fetch_types: false })
  return { db: drizzle(sql, { schema }), close: () => sql.end() }
}
