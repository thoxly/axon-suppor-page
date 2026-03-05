import { Pool } from "pg";

const connectionString = process.env.SUPABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_URL is not configured");
}

let pool: unknown = null;

function getPool() {
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
  const result = await client.query<T>(text, params);
  return { rows: result.rows };
}

