import { afterEach, describe, expect, it } from "bun:test";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { createTestDb } from "@hhuacm-dashboard/db/testing";
import { accountStatsRefreshKindByPlatform } from "./account-stats";
import { luoguProblemDetailsRefreshKind } from "./jobs/luogu-problem-details";
import { enqueueRefreshRequest } from "./request-store";
import { runRefreshWorkerOnce } from "./worker";

let cleanupTestDb: null | (() => Promise<void>) = null;

const createDb = async () => {
  const testDb = await createTestDb();
  cleanupTestDb = testDb.cleanup;
  return testDb.db;
};

afterEach(async () => {
  await cleanupTestDb?.();
  cleanupTestDb = null;
});

describe("refresh worker", () => {
  it("handles and consumes the next request", async () => {
    const db = await createDb();
    await enqueueRefreshRequest(db, {
      kind: luoguProblemDetailsRefreshKind,
      targetId: "P1563",
    });

    const handled = await runRefreshWorkerOnce(db);
    const remainingRequests = await db.select().from(refreshRequest);

    expect(handled).toBe(true);
    expect(remainingRequests).toHaveLength(0);
  });

  it("consumes failed requests and propagates the error", async () => {
    const db = await createDb();
    await enqueueRefreshRequest(db, {
      kind: accountStatsRefreshKindByPlatform.codeforces,
      targetId: "missing-account",
    });

    await expect(runRefreshWorkerOnce(db)).rejects.toThrow(
      "Codeforces account does not exist: missing-account"
    );
    const remainingRequests = await db.select().from(refreshRequest);

    expect(remainingRequests).toHaveLength(0);
  });
});
