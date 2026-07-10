import { Pool, PoolClient, QueryResultRow } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://f1news:f1news_secret_2024@localhost:5432/f1news",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})



export function getPool(): Pool {
  return pool
}

export interface DbQuery {
  query<R extends QueryResultRow = any>(sql: string, params?: any[]): Promise<{ rows: R[]; rowCount: number | null }>
  get<R = any>(sql: string, params?: any[]): Promise<R | undefined>
  all<R = any>(sql: string, params?: any[]): Promise<R[]>
  run(sql: string, params?: any[]): Promise<{ rowCount: number | null }>
  transaction<T>(fn: (db: DbQuery) => Promise<T>): Promise<T>
}

/** Convert ? to $N, then inline NULL params and handle ? IS NULL pattern. */
function prepare(sql: string, params?: any[]): { text: string; values: any[] } {
  if (!params || params.length === 0) return { text: sql, values: [] }

  // Phase 1: convert ? to $N
  let idx = 0
  const converted = sql.replace(/\?/g, () => { idx++; return `$${idx}` })

  // Phase 2: process each $N placeholder. For $N IS NULL we substitute TRUE
  // or FALSE at compile time so PG never sees a bare-typed param in IS NULL.
  const values: any[] = []
  let pidx = 0

  const text = converted.replace(
    /\$(\d+)(?:\s*::\s*\w+(?:\([^)]*\))?)?(\s+IS\s+(?:NOT\s+)?NULL(?=[\s)]|$))?/gi,
    (_match, _num, isNullClause) => {
      pidx++
      const val = params[pidx - 1]

      // $N IS NULL → TRUE if null, FALSE if non-null
      // $N IS NOT NULL → FALSE if null, TRUE if non-null
      if (isNullClause) {
        if (val === null || val === undefined) {
          return isNullClause.toUpperCase().includes("NOT ") ? "FALSE" : "TRUE"
        }
        return isNullClause.toUpperCase().includes("NOT ") ? "TRUE" : "FALSE"
      }

      // Null param elsewhere → inline NULL
      if (val === null || val === undefined) return "NULL"

      // Normal param
      values.push(val)
      return `$${values.length}`
    }
  )

  return { text, values }
}

function clientDb(client: PoolClient): DbQuery {
  const q = async (sql: string, params?: any[]) => {
    const { text, values } = prepare(sql, params)
    const r = await client.query(text, values)
    return { rows: r.rows as any[], rowCount: r.rowCount }
  }
  return {
    query: q,
    get: async (sql, params) => (await q(sql, params)).rows[0] as any,
    all: async (sql, params) => (await q(sql, params)).rows as any[],
    run: async (sql, params) => { const r = await q(sql, params); return { rowCount: r.rowCount } },
    transaction: async (fn) => {
      await client.query("BEGIN")
      try {
        const result = await fn(clientDb(client))
        await client.query("COMMIT")
        return result
      } catch (e) {
        await client.query("ROLLBACK")
        throw e
      }
    },
  }
}

function poolDb(p: Pool): DbQuery {
  const q = async (sql: string, params?: any[]) => {
    const { text, values } = prepare(sql, params)
    try {
      const r = await p.query(text, values)
      return { rows: r.rows as any[], rowCount: r.rowCount }
    } catch (err: any) {
      if (err?.code === "42P18") {
        console.error("[pg 42P18] SQL:", sql.slice(0, 500))
        console.error("[pg 42P18] Params:", params)
        console.error("[pg 42P18] Built text:", text.slice(0, 500))
        console.error("[pg 42P18] Built values:", values)
      }
      throw err
    }
  }
  return {
    query: q,
    get: async (sql, params) => (await q(sql, params)).rows[0] as any,
    all: async (sql, params) => (await q(sql, params)).rows as any[],
    run: async (sql, params) => { const r = await q(sql, params); return { rowCount: r.rowCount } },
    transaction: async (fn) => {
      const client = await p.connect()
      try {
        await client.query("BEGIN")
        const result = await fn(clientDb(client))
        await client.query("COMMIT")
        return result
      } catch (e) {
        await client.query("ROLLBACK")
        throw e
      } finally {
        client.release()
      }
    },
  }
}

let _db: DbQuery | null = null

export function getDb(): DbQuery {
  if (!_db) {
    _db = poolDb(pool)
  }
  return _db
}
