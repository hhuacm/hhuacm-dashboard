import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Database } from "@hhuacm-dashboard/db";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import type { RefreshJobDefinition } from "./jobs/definition";
import { enqueueRefreshRequest } from "./request-store";
import { runRefreshWorkerOnce } from "./worker";

const createRefreshRequestTableSql = `
create table refresh_request (
	  kind text not null,
	  target_id text not null,
	  created_at integer default (cast(unixepoch('subsecond') * 1000 as integer)) not null,
    primary key (kind, target_id)
	)
	`;

const createTestDb = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "refresh-runtime-"));
  const client = createClient({
    url: `file:${path.join(directory, "test.db")}`,
  });

  await client.execute(createRefreshRequestTableSql);
  await client.execute(
    "create index refresh_request_created_at_idx on refresh_request (created_at)"
  );

  return {
    db: drizzle({
      client,
      schema: { refreshRequest },
    }) as unknown as Database,
    directory,
  };
};

let testDirectory: null | string = null;

afterEach(async () => {
  if (testDirectory) {
    await rm(testDirectory, { force: true, recursive: true });
    testDirectory = null;
  }
});

const createTestRequest = (db: Database) =>
  enqueueRefreshRequest(db, {
    kind: codeforcesAccountStatsJob.kind,
    targetId: "account-1",
  });

describe("refresh worker", () => {
  it("deletes requests after successful handlers", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    await createTestRequest(db);
    const handledTargetIds: string[] = [];
    const definitions = [
      {
        handle: (_db, request) => {
          handledTargetIds.push(request.targetId);
          return Promise.resolve(undefined);
        },
        clear: codeforcesAccountStatsJob.clear,
        enqueue: codeforcesAccountStatsJob.enqueue,
        kind: codeforcesAccountStatsJob.kind,
      },
    ] satisfies RefreshJobDefinition[];

    const result = await runRefreshWorkerOnce(db, definitions);
    const remainingRequests = await db.select().from(refreshRequest);

    expect(handledTargetIds).toEqual(result ? [result.request.targetId] : []);
    expect(remainingRequests).toHaveLength(0);
  });

  it("deletes requests after failed handlers", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    await createTestRequest(db);
    const definitions = [
      {
        handle: () => Promise.reject(new Error("network failed")),
        clear: codeforcesAccountStatsJob.clear,
        enqueue: codeforcesAccountStatsJob.enqueue,
        kind: codeforcesAccountStatsJob.kind,
      },
    ] satisfies RefreshJobDefinition[];

    await expect(runRefreshWorkerOnce(db, definitions)).rejects.toThrow(
      "network failed"
    );
    const remainingRequests = await db.select().from(refreshRequest);

    expect(remainingRequests).toHaveLength(0);
  });

  it("returns null when there is no request", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;

    const result = await runRefreshWorkerOnce(db, []);

    expect(result).toBeNull();
  });

  it("rejects unsupported request kinds", async () => {
    const { db, directory } = await createTestDb();
    testDirectory = directory;
    const created = await enqueueRefreshRequest(db, {
      kind: codeforcesAccountStatsJob.kind,
      targetId: "account-1",
    });

    if (!created) {
      throw new Error("Expected created request");
    }

    await expect(runRefreshWorkerOnce(db, [])).rejects.toThrow(
      "Unsupported refresh request kind: codeforces.accountStats"
    );
    const remainingRequests = await db.select().from(refreshRequest);

    expect(remainingRequests).toHaveLength(0);
  });
});
