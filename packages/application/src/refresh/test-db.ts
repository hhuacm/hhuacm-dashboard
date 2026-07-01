import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Database } from "@hhuacm-dashboard/db";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const createRefreshRequestTableSql = `
create table refresh_request (
	  kind text not null,
	  target_id text not null,
	  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
    primary key (kind, target_id)
	)
	`;

const createRefreshRequestCreatedAtIndexSql =
  "create index refresh_request_created_at_idx on refresh_request (created_at)";

export const createRefreshRequestTestDb = async (prefix: string) => {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  const client = createClient({
    url: `file:${path.join(directory, "test.db")}`,
  });
  let cleanedUp = false;
  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    client.close();
    await rm(directory, { force: true, recursive: true });
  };

  try {
    await client.execute(createRefreshRequestTableSql);
    await client.execute(createRefreshRequestCreatedAtIndexSql);
  } catch (error) {
    await cleanup();
    throw error;
  }

  return {
    cleanup,
    db: drizzle({
      client,
      schema: { refreshRequest },
    }) as unknown as Database,
  };
};
