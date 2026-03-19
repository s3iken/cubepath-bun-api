import { readFileSync } from "fs";
import { join } from "path";
import { requireDb } from "./index";

export async function initSchema(): Promise<void> {
  const db = requireDb();
  const schemaPath = join(import.meta.dir, "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  await db.unsafe(schema);
}

if (import.meta.main) {
  initSchema()
    .then(() => {
    console.log("Schema initialized");
    process.exit(0);
    })
    .catch((err) => {
    console.error("Schema init failed:", err);
    process.exit(1);
  });
}
