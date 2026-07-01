import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import type { schema } from "./schema/index";

export const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "migrations"
);
export const initialMigrationSnapshotPath = resolve(
  migrationsFolder,
  "meta",
  "0000_snapshot.json"
);

export const migrateDatabase = (db: LibSQLDatabase<typeof schema>) =>
  migrate(db, { migrationsFolder });

export const readInitialMigration = () => {
  const [migration] = readMigrationFiles({ migrationsFolder });

  if (!migration) {
    throw new Error("No initial database migration found.");
  }

  return migration;
};
