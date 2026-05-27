import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export interface RpcResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

async function query<T = unknown>(sql: string, params?: unknown[]): Promise<RpcResult<T>> {
  const client: PoolClient = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return { data: result.rows as T, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    return { data: null, error: { message } };
  } finally {
    client.release();
  }
}

async function queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<RpcResult<T>> {
  const result = await query<T>(sql, params);
  if (result.error) return result;
  const rows = result.data as unknown as T[];
  return { data: (rows && rows.length > 0 ? rows[0] : null) as T, error: null };
}

function serializeForPg(val: unknown): unknown {
  if (typeof val === 'object' && val !== null) {
    if (val instanceof Date || ArrayBuffer.isView(val)) return val;
    return JSON.stringify(val);
  }
  return val;
}

function buildSetClause(data: Record<string, unknown>, startIndex = 0): { setClause: string; values: unknown[] } {
  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  const values = keys.map(k => serializeForPg(data[k]));
  const setClause = keys.map((k, i) => `"${k}" = $${startIndex + i + 1}`).join(', ');
  return { setClause, values };
}

// Public API matching the old Supabase client pattern: client.rpc("method", params)
// This minimizes changes across all route files.
class PgRpcClient {
  async rpc(method: string, params: Record<string, unknown>): Promise<RpcResult> {
    switch (method) {
      case 'dp_select':
        return this.dpSelect(params.p_table as string);
      case 'dp_insert':
        return this.dpInsert(params.p_table as string, params.p_data as Record<string, unknown>);
      case 'dp_update':
        return this.dpUpdate(params.p_table as string, params.p_id as string, params.p_data as Record<string, unknown>);
      case 'dp_delete':
        return this.dpDelete(params.p_table as string, params.p_id as string);
      case 'dp_get_by_id':
        return this.dpGetById(params.p_table as string, params.p_id as string);
      case 'execute_sql':
        return this.executeSql(params.p_sql as string);
      case 'query_to_jsonb':
        return this.queryToJsonb(params.p_sql as string || params.p_query as string);
      case 'dp_insert_generic':
        return this.dpInsertGeneric(
          (params.p_schema as string) || 'public',
          params.p_table as string,
          params.p_data as Record<string, unknown>
        );
      case 'dp_update_varchar':
        return this.dpUpdateVarchar(params.p_table as string, params.p_id as string, params.p_data as Record<string, unknown>);
      case 'dp_delete_varchar':
        return this.dpDeleteVarchar(params.p_table as string, params.p_id as string);
      default:
        return { data: null, error: { message: `Unknown RPC method: ${method}` } };
    }
  }

  // Direct query builder methods for compatibility
  from(table: string) {
    return new PgQueryBuilder(table);
  }

  private async dpSelect(table: string): Promise<RpcResult<Record<string, unknown>[]>> {
    const t = table.includes('.') ? table : `"${table}"`;
    return query<Record<string, unknown>>(`SELECT * FROM ${t}`);
  }

  private async dpInsert(table: string, data: Record<string, unknown>): Promise<RpcResult<Record<string, unknown>>> {
    const t = table.includes('.') ? table : `"${table}"`;
    const keys = Object.keys(data).filter(k => data[k] !== undefined);
    const values = keys.map(k => serializeForPg(data[k]));
    const columns = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${t} (${columns}) VALUES (${placeholders}) RETURNING *`;
    return queryOne<Record<string, unknown>>(sql, values);
  }

  private async dpUpdate(table: string, id: string, data: Record<string, unknown>): Promise<RpcResult<Record<string, unknown>>> {
    const t = table.includes('.') ? table : `"${table}"`;
    const { setClause, values } = buildSetClause(data);
    if (!setClause) return { data: null, error: { message: 'No data to update' } };
    values.push(id);
    const sql = `UPDATE ${t} SET ${setClause} WHERE id = $${values.length} RETURNING *`;
    return queryOne<Record<string, unknown>>(sql, values);
  }

  private async dpDelete(table: string, id: string): Promise<RpcResult<null>> {
    const t = table.includes('.') ? table : `"${table}"`;
    return query(`DELETE FROM ${t} WHERE id = $1`, [id]);
  }

  private async dpGetById(table: string, id: string): Promise<RpcResult<Record<string, unknown>>> {
    const t = table.includes('.') ? table : `"${table}"`;
    return queryOne<Record<string, unknown>>(`SELECT * FROM ${t} WHERE id = $1`, [id]);
  }

  private async executeSql(sql: string): Promise<RpcResult<Record<string, unknown>[]>> {
    // Handle potential multiple statements (uncommon but the old execute_sql supported it)
    const trimmed = sql.trim();
    return query<Record<string, unknown>>(trimmed);
  }

  private async queryToJsonb(sql: string): Promise<RpcResult<Record<string, unknown>[]>> {
    return query<Record<string, unknown>>(sql);
  }

  private async dpInsertGeneric(schema: string, table: string, data: Record<string, unknown>): Promise<RpcResult<Record<string, unknown>>> {
    return this.dpInsert(`${schema}.${table}`, data);
  }

  private async dpUpdateVarchar(table: string, id: string, data: Record<string, unknown>): Promise<RpcResult<Record<string, unknown>>> {
    return this.dpUpdate(table, id, data);
  }

  private async dpDeleteVarchar(table: string, id: string): Promise<RpcResult<null>> {
    return this.dpDelete(table, id);
  }
}

// Query builder for .from().select().eq().order() pattern
class PgQueryBuilder {
  private tableName: string;
  private _select = '*';
  private conditions: Array<{ col: string; op: string; val: unknown }> = [];
  private _order: { col: string; dir: string } | null = null;

  constructor(table: string) {
    this.tableName = table;
  }

  select(columns: string) {
    this._select = columns;
    return this;
  }

  eq(col: string, val: unknown) {
    this.conditions.push({ col, op: '=', val });
    return this;
  }

  order(col: string, opts: { ascending: boolean }) {
    this._order = { col, dir: opts.ascending ? 'ASC' : 'DESC' };
    return this;
  }

  async execute(): Promise<RpcResult<Record<string, unknown>[]>> {
    let sql = `SELECT ${this._select} FROM "${this.tableName}"`;
    const params: unknown[] = [];
    if (this.conditions.length > 0) {
      const clauses = this.conditions.map((c, i) => {
        params.push(c.val);
        return `"${c.col}" ${c.op} $${i + 1}`;
      });
      sql += ' WHERE ' + clauses.join(' AND ');
    }
    if (this._order) {
      sql += ` ORDER BY "${this._order.col}" ${this._order.dir}`;
    }
    return query<Record<string, unknown>>(sql, params);
  }

  // Make the query builder thenable (acts like a Promise)
  then<TResult1 = RpcResult<Record<string, unknown>[]>, TResult2 = never>(
    onfulfilled?: ((value: RpcResult<Record<string, unknown>[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Server-side client (replaces createServerClient)
export async function createServerClient(): Promise<PgRpcClient> {
  return new PgRpcClient();
}

// Client-safe version (replaces createClient / getSupabaseClient)
export function getSupabaseClient(): PgRpcClient {
  return new PgRpcClient();
}

// Backwards-compatible alias
export { getSupabaseClient as createClient };