import { afterEach, describe, expect, it } from "bun:test";
import type { Database } from "@hhuacm-dashboard/db";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { createTestDb } from "@hhuacm-dashboard/db/testing";
import { asc, eq } from "drizzle-orm";
import { codeforcesAccountStatsJob } from "./jobs/codeforces-account-stats";
import { luoguAccountStatsJob } from "./jobs/luogu-account-stats";
import {
  deleteRefreshRequest,
  enqueueRefreshRequest,
  getNextRefreshRequest,
} from "./request-store";

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

const createTestRequest = (db: Database, targetId = "account-1") =>
  enqueueRefreshRequest(db, {
    kind: codeforcesAccountStatsJob.kind,
    targetId,
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

    const firstRequestCreated = await createTestRequest(db);
    const secondRequestCreated = await enqueueRefreshRequest(db, {
      kind: codeforcesAccountStatsJob.kind,
      targetId: "account-1",
    });
    const requests = await listRequests(db, "account-1");

    expect(firstRequestCreated).toBe(true);
    expect(secondRequestCreated).toBe(false);
    expect(requests).toHaveLength(1);
  });

  it("keeps separate requests for separate kinds", async () => {
    const db = await createDb();

    await createTestRequest(db);
    await enqueueRefreshRequest(db, {
      kind: luoguAccountStatsJob.kind,
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
      kind: codeforcesAccountStatsJob.kind,
      targetId: "first",
    });
    await enqueueRefreshRequest(db, {
      kind: codeforcesAccountStatsJob.kind,
      targetId: "second",
    });

    const request = await getNextRefreshRequest(db);

    expect(request?.targetId).toBe("first");
  });

  it("deletes requests by kind and target", async () => {
    const db = await createDb();

    await createTestRequest(db, "account-1");
    await createTestRequest(db, "account-1");
    await createTestRequest(db, "account-2");

    await deleteRefreshRequest(db, {
      kind: codeforcesAccountStatsJob.kind,
      targetId: "account-1",
    });

    const remainingRequests = await db.select().from(refreshRequest);

    expect(remainingRequests).toHaveLength(1);
    expect(remainingRequests[0]?.targetId).toBe("account-2");
  });
});
