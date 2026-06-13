import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createPool } from "./db";

const pool = createPool();

try {
  const schemaPath = resolve("supabase", "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  await pool.query(sql);
  const migrationsPath = resolve("supabase", "migrations");
  const migrations = await readdir(migrationsPath).catch(() => []);

  for (const file of migrations.filter((item) => item.endsWith(".sql")).sort()) {
    const migrationSql = await readFile(resolve(migrationsPath, file), "utf8");
    await pool.query(migrationSql);
    console.log(`Applied migration ${file}`);
  }

  console.log("DeskGuard schema migrated.");
} finally {
  await pool.end();
}
