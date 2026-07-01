import { readFileSync } from "node:fs";
import type { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  initialMigrationSnapshotPath,
  migrateDatabase,
  readInitialMigration,
} from "./migration";
import { schema } from "./schema/index";

type DbClient = ReturnType<typeof createClient>;

interface SnapshotView {
  columns: Record<string, unknown>;
}

interface SnapshotTable extends SnapshotView {
  indexes: Record<string, unknown>;
}

interface InitialSnapshot {
  tables: Record<string, SnapshotTable>;
  views: Record<string, SnapshotView>;
}

interface SchemaValidation {
  hasExpectedObject: boolean;
  missing: string[];
}

type DatabaseState =
  | { kind: "empty" }
  | { kind: "existingSchema" }
  | { kind: "managed" }
  | { kind: "unsupported"; missing: string[] };

const quoteIdentifier = (identifier: string) =>
  `"${identifier.replaceAll('"', '""')}"`;

const readInitialSnapshot = () =>
  JSON.parse(
    readFileSync(initialMigrationSnapshotPath, "utf8")
  ) as InitialSnapshot;

const formatMissingObjects = (missing: string[]) => {
  const displayed = missing.slice(0, 12).join(", ");
  const remaining = missing.length - 12;

  if (remaining <= 0) {
    return displayed;
  }

  return `${displayed}, and ${remaining} more`;
};

const readObjectNames = async (client: DbClient, type: "table" | "view") => {
  const result = await client.execute({
    args: [type],
    sql: "SELECT name FROM sqlite_master WHERE type = ?;",
  });
  const names = new Set<string>();

  for (const row of result.rows) {
    if (typeof row.name === "string") {
      names.add(row.name);
    }
  }

  return names;
};

const hasTable = async (client: DbClient, tableName: string) => {
  const result = await client.execute({
    args: [tableName],
    sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1;",
  });

  return result.rows.length > 0;
};

const readColumnNames = async (client: DbClient, objectName: string) => {
  const result = await client.execute(
    `PRAGMA table_info(${quoteIdentifier(objectName)});`
  );
  const names = new Set<string>();

  for (const row of result.rows) {
    if (typeof row.name === "string") {
      names.add(row.name);
    }
  }

  return names;
};

const readIndexNames = async (client: DbClient, tableName: string) => {
  const result = await client.execute(
    `PRAGMA index_list(${quoteIdentifier(tableName)});`
  );
  const names = new Set<string>();

  for (const row of result.rows) {
    if (typeof row.name === "string") {
      names.add(row.name);
    }
  }

  return names;
};

const findMissingNames = (
  expected: Record<string, unknown>,
  actual: Set<string>,
  label: string
) => {
  const missing: string[] = [];

  for (const name of Object.keys(expected)) {
    if (!actual.has(name)) {
      missing.push(`${label}${name}`);
    }
  }

  return missing;
};

const ensureMigrationsTable = async (client: DbClient) => {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at numeric
    )
  `);
};

const hasRecordedMigration = async (client: DbClient) => {
  if (!(await hasTable(client, "__drizzle_migrations"))) {
    return false;
  }

  const result = await client.execute(
    'SELECT 1 FROM "__drizzle_migrations" LIMIT 1;'
  );

  return result.rows.length > 0;
};

const validateInitialSchema = async (
  client: DbClient
): Promise<SchemaValidation> => {
  const snapshot = readInitialSnapshot();
  const tables = await readObjectNames(client, "table");
  const views = await readObjectNames(client, "view");
  const missing: string[] = [];
  let hasExpectedObject = false;

  for (const [tableName, table] of Object.entries(snapshot.tables)) {
    if (!tables.has(tableName)) {
      missing.push(`table ${tableName}`);
      continue;
    }

    hasExpectedObject = true;
    const columns = await readColumnNames(client, tableName);
    const indexes = await readIndexNames(client, tableName);

    missing.push(
      ...findMissingNames(table.columns, columns, `column ${tableName}.`),
      ...findMissingNames(table.indexes, indexes, `index ${tableName}.`)
    );
  }

  for (const [viewName, view] of Object.entries(snapshot.views)) {
    if (!views.has(viewName)) {
      missing.push(`view ${viewName}`);
      continue;
    }

    hasExpectedObject = true;
    const columns = await readColumnNames(client, viewName);

    missing.push(
      ...findMissingNames(view.columns, columns, `column ${viewName}.`)
    );
  }

  return { hasExpectedObject, missing };
};

const inspectDatabaseState = async (
  client: DbClient
): Promise<DatabaseState> => {
  if (await hasRecordedMigration(client)) {
    return { kind: "managed" };
  }

  const validation = await validateInitialSchema(client);

  if (!validation.hasExpectedObject) {
    return { kind: "empty" };
  }

  if (validation.missing.length > 0) {
    return { kind: "unsupported", missing: validation.missing };
  }

  return { kind: "existingSchema" };
};

const adoptExistingSchemaAsBaseline = async (client: DbClient) => {
  await ensureMigrationsTable(client);

  if (await hasRecordedMigration(client)) {
    return;
  }

  const initialMigration = readInitialMigration();

  await client.execute({
    args: [initialMigration.hash, initialMigration.folderMillis],
    sql: 'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?);',
  });
};

const readViewNames = async (client: DbClient) => {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name;"
  );
  const names: string[] = [];

  for (const row of result.rows) {
    if (typeof row.name === "string") {
      names.push(row.name);
    }
  }

  return names;
};

const verifyDatabase = async (client: DbClient) => {
  const integrity = await client.execute("PRAGMA integrity_check;");

  if (integrity.rows[0]?.integrity_check !== "ok") {
    throw new Error("PRAGMA integrity_check failed.");
  }

  const foreignKeys = await client.execute("PRAGMA foreign_key_check;");

  if (foreignKeys.rows.length > 0) {
    throw new Error(
      `PRAGMA foreign_key_check reported ${foreignKeys.rows.length} issue(s).`
    );
  }

  for (const name of await readViewNames(client)) {
    await client.execute(`SELECT * FROM ${quoteIdentifier(name)} LIMIT 0;`);
  }
};

export const synchronizeDatabase = async (client: DbClient) => {
  const db = drizzle({ client, schema });

  await client.execute("pragma foreign_keys = on");

  const state = await inspectDatabaseState(client);

  if (state.kind === "unsupported") {
    throw new Error(
      `Database schema does not match the expected baseline. Missing: ${formatMissingObjects(
        state.missing
      )}.`
    );
  }

  if (state.kind === "existingSchema") {
    await adoptExistingSchemaAsBaseline(client);
  }

  await migrateDatabase(db);
  await verifyDatabase(client);

  return {
    adoptedBaseline: state.kind === "existingSchema",
  };
};
