import { afterEach, describe, expect, it } from "bun:test";
import type { Database } from "@hhuacm-dashboard/db";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import type { RefreshJobDefinition } from "./jobs/definition";
import { enqueueRefreshRequest } from "./request-store";
import { createRefreshRequestTestDb } from "./test-db";
import { runRefreshWorkerOnce } from "./worker";

const createTestDb = async () => {
  const testDb = await createRefreshRequestTestDb("refresh-runtime-");
  cleanupTestDb = testDb.cleanup;
  return testDb.db;
};

let cleanupTestDb: null | (() => Promise<void>) = null;

afterEach(async () => {
  await cleanupTestDb?.();
  cleanupTestDb = null;
});

const createTestRequest = (db: Database) =>
  enqueueRefreshRequest(db, {
    kind: codeforcesAccountStatsJob.kind,
    targetId: "account-1",
  });

describe("refresh worker", () => {
  it("deletes requests after successful handlers", async () => {
    const db = await createTestDb();
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
    const db = await createTestDb();
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
    const db = await createTestDb();

    const result = await runRefreshWorkerOnce(db, []);

    expect(result).toBeNull();
  });

  it("rejects unsupported request kinds", async () => {
    const db = await createTestDb();
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
