import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";
import { createTestDb } from "@hhuacm-dashboard/db/testing";
import { addOjAccount, updateOjAccount } from "../services/oj-account/commands";
import { updateUserProfile } from "../services/profile";
import {
  accountStatsRefreshKindByPlatform,
  enqueueDueAccountStatsRequests,
} from "./account-stats";
import { luoguProblemDetailsRefreshKind } from "./jobs/luogu-problem-details";
import { enqueueDueUserAwardsFromLuoguRequests } from "./jobs/user-awards-from-luogu";
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
  it("skips queued stats after freezing and refreshes again after reactivation", async () => {
    const db = await createDb();
    await db.insert(user).values({
      email: "member@example.com",
      id: "member",
      memberStatus: "active",
      name: "Member",
      username: "member",
    });
    await db.insert(userOjAccount).values({
      externalId: "tourist",
      handle: "tourist",
      id: "account",
      platform: "atcoder",
      userId: "member",
    });
    await db.insert(atcoderAccountStats).values({
      accountId: "account",
      fetchedAt: new Date("2026-01-01T00:00:00Z"),
      rating: 1000,
      recentPerformanceAverage: 900,
    });
    const cachedStats = await db.select().from(atcoderAccountStats);
    await enqueueDueAccountStatsRequests(db, new Date());
    expect(await db.select().from(refreshRequest)).toHaveLength(1);
    await updateUserProfile(db, {
      userId: "member",
      values: { memberStatus: "frozen" },
    });

    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        () =>
          Promise.resolve(
            Response.json([
              {
                EndTime: "2026-01-01T00:00:00Z",
                IsRated: true,
                NewRating: 2000,
                Performance: 2000,
              },
            ])
          ),
        { preconnect: globalThis.fetch.preconnect }
      )
    );
    try {
      expect(await runRefreshWorkerOnce(db)).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(await db.select().from(atcoderAccountStats)).toEqual(cachedStats);
      expect(await db.select().from(refreshRequest)).toEqual([]);

      await updateUserProfile(db, {
        userId: "member",
        values: { memberStatus: "active" },
      });
      await enqueueDueAccountStatsRequests(db, new Date());
      expect(await runRefreshWorkerOnce(db)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [stats] = await db.select().from(atcoderAccountStats);
      expect(stats?.rating).toBe(2000);
      expect(await db.select().from(refreshRequest)).toEqual([]);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("skips queued awards after retirement and preserves the cached awards", async () => {
    const db = await createDb();
    await db.insert(user).values({
      email: "member@example.com",
      id: "member",
      memberStatus: "active",
      name: "Member",
      username: "member",
    });
    await db.insert(userOjAccount).values({
      externalId: "97238",
      handle: "forlight",
      id: "account",
      platform: "luogu",
      userId: "member",
    });
    await db.insert(userAward).values({
      contest: "ICPC Regional",
      level: "金牌",
      sortOrder: 0,
      source: "luogu",
      userId: "member",
      year: 2025,
    });
    await db.insert(userAwardSync).values({
      fetchedAt: new Date("2026-01-01T00:00:00Z"),
      source: "luogu",
      userId: "member",
    });
    const cachedAwards = await db.select().from(userAward);
    const cachedSync = await db.select().from(userAwardSync);
    await enqueueDueUserAwardsFromLuoguRequests(db, new Date());
    expect(await db.select().from(refreshRequest)).toHaveLength(1);
    await updateUserProfile(db, {
      userId: "member",
      values: { memberStatus: "retired" },
    });

    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      Object.assign(
        () =>
          Promise.resolve(
            Response.json(
              { data: { prizes: [] }, status: 200 },
              { headers: { "set-cookie": "C3VK=retired-member" } }
            )
          ),
        { preconnect: globalThis.fetch.preconnect }
      )
    );
    try {
      expect(await runRefreshWorkerOnce(db)).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(await db.select().from(userAward)).toEqual(cachedAwards);
      expect(await db.select().from(userAwardSync)).toEqual(cachedSync);
      expect(await db.select().from(refreshRequest)).toEqual([]);
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("discards an old binding response and preserves the replacement request", async () => {
    const db = await createDb();
    await db.insert(user).values({
      email: "member@example.com",
      id: "member",
      memberStatus: "active",
      name: "Member",
      username: "member",
    });
    await addOjAccount(db, {
      externalId: "old-account",
      platform: "atcoder",
      userId: "member",
    });

    const started = Promise.withResolvers<void>();
    const response = Promise.withResolvers<Response>();
    const history = (rating: number) => [
      {
        EndTime: "2026-01-01T00:00:00Z",
        IsRated: true,
        NewRating: rating,
        Performance: rating,
      },
    ];
    const fetchResponse = Object.assign(
      (url: Parameters<typeof fetch>[0]) => {
        if (String(url).includes("/old-account/")) {
          started.resolve();
          return response.promise;
        }
        return Promise.resolve(Response.json(history(2000)));
      },
      { preconnect: globalThis.fetch.preconnect }
    );
    const fetchMock = spyOn(globalThis, "fetch").mockImplementation(
      fetchResponse
    );
    const running = runRefreshWorkerOnce(db);

    try {
      await started.promise;
      await updateOjAccount(db, {
        externalId: "new-account",
        platform: "atcoder",
        userId: "member",
      });
      response.resolve(Response.json(history(1000)));
      await running;

      expect(await db.select().from(atcoderAccountStats)).toEqual([]);
      expect(await db.select().from(refreshRequest)).toHaveLength(1);
      expect(await runRefreshWorkerOnce(db)).toBe(true);
      const [stats] = await db.select().from(atcoderAccountStats);
      expect(stats?.rating).toBe(2000);
      expect(await db.select().from(refreshRequest)).toEqual([]);
    } finally {
      response.resolve(Response.json([]));
      await running;
      fetchMock.mockRestore();
    }
  });

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

  it("consumes requests for deleted accounts", async () => {
    const db = await createDb();
    await enqueueRefreshRequest(db, {
      kind: accountStatsRefreshKindByPlatform.codeforces,
      targetId: "missing-account",
    });

    await expect(runRefreshWorkerOnce(db)).resolves.toBe(true);
    const remainingRequests = await db.select().from(refreshRequest);

    expect(remainingRequests).toHaveLength(0);
  });
});
