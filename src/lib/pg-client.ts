import postgres from "postgres";

export async function withConnection<T>(
  connectionString: string,
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });
  try {
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

export async function runQuery(
  connectionString: string,
  query: string,
): Promise<{ rows: Record<string, unknown>[]; rowCount: number; command: string }> {
  return withConnection(connectionString, async (sql) => {
    const result = await sql.unsafe(query);
    return {
      rows: result as unknown as Record<string, unknown>[],
      rowCount: result.length,
      command: (result as any).command ?? "SELECT",
    };
  });
}

export async function getSchema(connectionString: string): Promise<Record<string, unknown>[]> {
  return withConnection(connectionString, async (sql) => {
    const tables = await sql`
      SELECT
        t.table_name,
        t.table_type
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `;

    const result: Record<string, unknown>[] = [];

    for (const table of tables) {
      const columns = await sql`
        SELECT
          c.column_name,
          c.data_type,
          c.udt_name,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = ${table.table_name}
        ORDER BY c.ordinal_position
      `;

      const constraints = await sql`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public' AND tc.table_name = ${table.table_name}
        ORDER BY tc.constraint_type, tc.constraint_name
      `;

      const indexes = await sql`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = ${table.table_name}
        ORDER BY indexname
      `;

      result.push({
        table: table.table_name,
        type: table.table_type,
        columns: columns.map((c: any) => ({
          name: c.column_name,
          type: c.udt_name + (c.character_maximum_length ? `(${c.character_maximum_length})` : ""),
          nullable: c.is_nullable === "YES",
          default: c.column_default,
        })),
        constraints: constraints.map((c: any) => ({
          name: c.constraint_name,
          type: c.constraint_type,
          column: c.column_name,
          ...(c.constraint_type === "FOREIGN KEY" && {
            references: `${c.foreign_table}.${c.foreign_column}`,
          }),
        })),
        indexes: indexes.map((i: any) => ({
          name: i.indexname,
          definition: i.indexdef,
        })),
      });
    }

    return result;
  });
}

export async function getTables(connectionString: string): Promise<Record<string, unknown>[]> {
  return withConnection(connectionString, async (sql) => {
    const result = await sql`
      SELECT
        t.table_name,
        t.table_type,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) AS estimated_rows,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) AS total_size
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `;
    return result as unknown as Record<string, unknown>[];
  });
}

export async function describeTable(
  connectionString: string,
  tableName: string,
): Promise<Record<string, unknown>> {
  return withConnection(connectionString, async (sql) => {
    const columns = await sql`
      SELECT
        c.column_name AS name,
        c.udt_name || COALESCE('(' || c.character_maximum_length || ')', '') AS type,
        CASE WHEN c.is_nullable = 'YES' THEN true ELSE false END AS nullable,
        c.column_default AS default_value
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = ${tableName}
      ORDER BY c.ordinal_position
    `;

    const constraints = await sql`
      SELECT
        tc.constraint_name AS name,
        tc.constraint_type AS type,
        kcu.column_name AS column,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = ${tableName}
      ORDER BY tc.constraint_type, tc.constraint_name
    `;

    const indexes = await sql`
      SELECT indexname AS name, indexdef AS definition
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = ${tableName}
      ORDER BY indexname
    `;

    const stats = await sql`
      SELECT
        reltuples::bigint AS estimated_rows,
        pg_size_pretty(pg_total_relation_size(quote_ident(${tableName}))) AS total_size,
        pg_size_pretty(pg_relation_size(quote_ident(${tableName}))) AS data_size,
        pg_size_pretty(pg_indexes_size(quote_ident(${tableName}))) AS index_size
      FROM pg_class
      WHERE relname = ${tableName}
    `;

    return {
      table: tableName,
      ...(stats[0] && {
        estimated_rows: stats[0].estimated_rows,
        total_size: stats[0].total_size,
        data_size: stats[0].data_size,
        index_size: stats[0].index_size,
      }),
      columns: columns as unknown as Record<string, unknown>[],
      constraints: constraints as unknown as Record<string, unknown>[],
      indexes: indexes as unknown as Record<string, unknown>[],
    };
  });
}

export async function testConnection(connectionString: string): Promise<boolean> {
  return withConnection(connectionString, async (sql) => {
    await sql`SELECT 1`;
    return true;
  });
}
