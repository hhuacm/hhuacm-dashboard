import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";

import type {
  CodeforcesSubmissionResult,
  CodeforcesUserInfoResult,
} from "../../external/online-judge-sources/codeforces/api";
import { createServiceTestDb } from "../test-db";
import {
  markCodeforcesAccountStatsRefreshFailed,
  syncCodeforcesAccountStats,
} from "./sync";

const toSeconds = (value: string) => Math.floor(Date.parse(value) / 1000);

const createUserInfo = (
  input: Partial<CodeforcesUserInfoResult[number]> = {}
): CodeforcesUserInfoResult[number] => ({
  handle: input.handle ?? "tourist",
  lastOnlineTimeSeconds:
    input.lastOnlineTimeSeconds ?? toSeconds("2026-01-01T08:00:00.000Z"),
  maxRating: input.maxRating ?? 3979,
  rating: input.rating ?? 3822,
});

const createSubmission = (
  input: {
    contestId?: number;
    creationTimeSeconds?: number;
    index?: number | string;
    problemsetName?: string;
    verdict?: string;
  } = {}
): CodeforcesSubmissionResult[number] => ({
  creationTimeSeconds:
    input.creationTimeSeconds ?? toSeconds("2026-01-05T00:00:00.000Z"),
  id: input.creationTimeSeconds ?? 1,
  problem: {
    ...(input.contestId === undefined ? {} : { contestId: input.contestId }),
    index: input.index ?? "A",
    ...(input.problemsetName === undefined
      ? {}
      : { problemsetName: input.problemsetName }),
  },
  verdict: input.verdict ?? "OK",
});

const createCodeforcesAccount = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>
) => {
  await db.insert(user).values({
    email: "codeforces@example.com",
    id: "user-codeforces",
    name: "codeforces",
    username: "codeforces",
  });
  await db.insert(userOjAccount).values({
    externalId: "tourist-old",
    handle: "tourist-old",
    id: "account-codeforces",
    platform: "codeforces",
    userId: "user-codeforces",
  });

  return {
    externalId: "tourist-old",
    handle: "tourist-old",
    id: "account-codeforces",
  };
};

describe("Codeforces sync", () => {
  it("writes stats, accepted problem counts, and canonical handle", async () => {
    const db = await createServiceTestDb();
    const account = await createCodeforcesAccount(db);
    const now = new Date("2026-01-31T00:00:00.000Z");
    const oldestRecentAcceptedAt = toSeconds("2026-01-02T00:00:00.000Z");

    const stats = await syncCodeforcesAccountStats(db, account, now, {
      loadUserInfo: async () => [
        createUserInfo({
          handle: "tourist",
          lastOnlineTimeSeconds: toSeconds("2026-01-30T12:00:00.000Z"),
          maxRating: 3979,
          rating: 3822,
        }),
      ],
      loadUserStatus: async () => [
        createSubmission({
          contestId: 1,
          creationTimeSeconds: oldestRecentAcceptedAt,
          index: "A",
        }),
        createSubmission({
          contestId: 1,
          creationTimeSeconds: toSeconds("2026-01-20T00:00:00.000Z"),
          index: "A",
        }),
        createSubmission({
          contestId: 2,
          creationTimeSeconds: toSeconds("2025-12-15T00:00:00.000Z"),
          index: "B",
        }),
        createSubmission({
          contestId: 3,
          creationTimeSeconds: toSeconds("2026-01-25T00:00:00.000Z"),
          index: "C",
          verdict: "WRONG_ANSWER",
        }),
        createSubmission({
          creationTimeSeconds: toSeconds("2026-01-28T00:00:00.000Z"),
          index: "D",
          problemsetName: "gym",
        }),
      ],
    });
    const [ojAccount] = await db.select().from(userOjAccount);

    expect(stats.rating).toBe(3822);
    expect(stats.maxRating).toBe(3979);
    expect(stats.lastOnlineAt?.toISOString()).toBe("2026-01-30T12:00:00.000Z");
    expect(stats.acceptedProblemCount).toBe(3);
    expect(stats.acceptedProblemCountInMonth).toBe(2);
    expect(stats.lastError).toBeNull();
    if (!stats.fetchedAt) {
      throw new Error("Expected Codeforces sync to write fetchedAt");
    }

    expect(stats.lastAttemptedAt.toISOString()).toBe(
      stats.fetchedAt.toISOString()
    );
    expect(ojAccount?.handle).toBe("tourist");
  });

  it("records failures without overwriting fetched stats", async () => {
    const db = await createServiceTestDb();
    const account = await createCodeforcesAccount(db);
    const failedAt = new Date("2026-02-01T00:00:00.000Z");

    const syncedStats = await syncCodeforcesAccountStats(
      db,
      account,
      new Date("2026-01-31T00:00:00.000Z"),
      {
        loadUserInfo: async () => [createUserInfo({ handle: "tourist" })],
        loadUserStatus: async () => [
          createSubmission({
            contestId: 1,
            creationTimeSeconds: toSeconds("2026-01-20T00:00:00.000Z"),
          }),
        ],
      }
    );
    await markCodeforcesAccountStatsRefreshFailed(
      db,
      { ...account, handle: "tourist" },
      new Error("network failed"),
      failedAt
    );

    const [stats] = await db.select().from(codeforcesAccountStats);

    expect(stats?.rating).toBe(syncedStats.rating);
    expect(stats?.acceptedProblemCount).toBe(1);
    expect(stats?.fetchedAt?.toISOString()).toBe(
      syncedStats.fetchedAt?.toISOString()
    );
    expect(stats?.lastAttemptedAt.toISOString()).toBe(failedAt.toISOString());
    expect(stats?.lastError).toBe("network failed");
  });

  it("rejects empty user.info results", async () => {
    const db = await createServiceTestDb();
    const account = await createCodeforcesAccount(db);

    await expect(
      syncCodeforcesAccountStats(
        db,
        account,
        new Date("2026-01-31T00:00:00.000Z"),
        {
          loadUserInfo: async () => [],
          loadUserStatus: async () => [],
        }
      )
    ).rejects.toThrow("Codeforces user.info tourist-old result is empty");
  });
});
