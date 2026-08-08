import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { schema } from "./schema/index";

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "migrations"
);
export const migrateDatabase = (db: LibSQLDatabase<typeof schema>) =>
  migrate(db, { migrationsFolder });
