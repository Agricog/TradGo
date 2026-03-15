import { neon, NeonQueryFunction } from '@neondatabase/serverless'

let sqlInstance: NeonQueryFunction<false, false> | null = null

/**
 * Get a Neon serverless SQL query function.
 * Reuses the instance within a single request for efficiency.
 * Each Worker invocation gets a fresh connection (serverless model).
 */
export function getDb(databaseUrl: string): NeonQueryFunction<false, false> {
  if (!sqlInstance) {
    sqlInstance = neon(databaseUrl)
  }
  return sqlInstance
}

/**
 * Helper: run a parameterised query and return typed rows.
 * Always use parameterised queries — never interpolate user input.
 */
export async function query<T = Record<string, unknown>>(
  databaseUrl: string,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const db = getDb(databaseUrl)
  const rows = await db(sql, params)
  return rows as T[]
}

/**
 * Helper: run a parameterised query expecting a single row.
 * Returns null if no rows found.
 */
export async function queryOne<T = Record<string, unknown>>(
  databaseUrl: string,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(databaseUrl, sql, params)
  return rows[0] ?? null
}
