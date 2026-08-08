import type { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrateDatabase } from "./migration";
import { schema } from "./schema/index";

type DbClient = ReturnType<typeof createClient>;

const quoteIdentifier = (identifier: string) =>
  `"${identifier.replaceAll('"', '""')}"`;

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
  await migrateDatabase(db);
  await verifyDatabase(client);
};
