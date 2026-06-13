import pg from "pg";
import { requiredEnv } from "./env";

const { Pool } = pg;

export function createPool() {
  return new Pool({
    connectionString: requiredEnv("DATABASE_URL"),
    ssl: {
      rejectUnauthorized: false
    }
  });
}
