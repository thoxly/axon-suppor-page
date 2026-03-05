import { Pool } from "pg";

type PgPool = InstanceType<typeof Pool>;

const connectionString = process.env.SUPABASE_URL;

let pool: PgPool | null = null;

function getPool(): PgPool {
  if (!connectionString) {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
    });
  }

  return pool;
}

export async function query<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<{ rows: T[] }> {
  const client = getPool();
  const result = await client.query(text, params);
  return { rows: result.rows as T[] };
}

