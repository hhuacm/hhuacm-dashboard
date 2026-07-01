import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { Database } from "./index";
import { migrateDatabase } from "./migration";
import { schema } from "./schema/index";

export const createTestDb = async (options: { prefix?: string } = {}) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), options.prefix ?? "hhuacm-test-db-")
  );
  const databaseUrl = `file:${path.join(directory, "test.db")}`;
  const client = createClient({ url: databaseUrl });
  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    client.close();
    await rm(directory, { force: true, recursive: true });
  };

  const db = drizzle({ client, schema }) as unknown as Database;

  try {
    await client.execute("pragma foreign_keys = on");
    await migrateDatabase(db);
  } catch (error) {
    await cleanup();
    throw error;
  }

  return {
    cleanup,
    client,
    databaseUrl,
    db,
  };
};
