import { SQL } from "bun";

const url = process.env.DATABASE_URL;

export const sql = url ? new SQL(url) : null;

export function requireDb(): NonNullable<typeof sql> {
  if (!sql) throw new Error("DATABASE_URL no configurada");
  return sql;
}
