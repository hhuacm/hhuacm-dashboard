import { afterEach, describe, expect, it } from "bun:test";
import type { Database } from "@hhuacm-dashboard/db";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { createTestDb } from "@hhuacm-dashboard/db/testing";
import { asc, eq } from "drizzle-orm";
import { accountStatsRefreshKindByPlatform } from "./account-stats";
import { enqueueRefreshRequest, getNextRefreshRequest } from "./request-store";

const createDb = async () => {
  const testDb = await createTestDb();
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
    kind: accountStatsRefreshKindByPlatform.codeforces,
    targetId: "account-1",
  });

const listRequests = (db: Database, targetId: string) =>
  db
    .select()
    .from(refreshRequest)
    .where(eq(refreshRequest.targetId, targetId))
    .orderBy(asc(refreshRequest.createdAt));

describe("refresh request store", () => {
  it("keeps one request for a target and kind", async () => {
    const db = await createDb();

    await createTestRequest(db);
    await enqueueRefreshRequest(db, {
      kind: accountStatsRefreshKindByPlatform.codeforces,
      targetId: "account-1",
    });
    const requests = await listRequests(db, "account-1");

    expect(requests).toHaveLength(1);
  });

  it("keeps separate requests for separate kinds", async () => {
    const db = await createDb();

    await createTestRequest(db);
    await enqueueRefreshRequest(db, {
      kind: accountStatsRefreshKindByPlatform.luogu,
      targetId: "account-1",
    });
    const requests = await listRequests(db, "account-1");

    expect(requests.map((request) => request.kind).sort()).toEqual([
      "codeforces.accountStats",
      "luogu.accountStats",
    ]);
  });

  it("takes requests by creation order", async () => {
    const db = await createDb();

    await enqueueRefreshRequest(db, {
      kind: accountStatsRefreshKindByPlatform.codeforces,
      targetId: "first",
    });
    await enqueueRefreshRequest(db, {
      kind: accountStatsRefreshKindByPlatform.codeforces,
      targetId: "second",
    });

    const request = await getNextRefreshRequest(db);

    expect(request?.targetId).toBe("first");
  });
});
