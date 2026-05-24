import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { eq } from "drizzle-orm";

import type { LuoguPracticePageData } from "../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../test-db";
import {
  markLuoguAccountStatsRefreshFailed,
  syncLuoguAccountStats,
} from "./sync";

const createPractice = (
  passed: LuoguPracticePageData["passed"],
  passedProblemCount: null | number = passed.length
): LuoguPracticePageData => ({
  elo: [],
  passed,
  submitted: [],
  user: {
    avatar: "",
    background: "",
    badge: null,
    ccfLevel: 0,
    color: "Blue",
    elo: null,
    eloValue: null,
    followerCount: 0,
    followingCount: 0,
    introduction: "",
    isAdmin: false,
    isBanned: false,
    name: "forlight",
    passedProblemCount,
    prize: [],
    ranking: null,
    registerTime: 0,
    slogan: "",
    submittedProblemCount: null,
    uid: 97_238,
    xcpcLevel: 0,
  },
});

const createLuoguAccount = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>
) => {
  await db.insert(user).values({
    email: "luogu@example.com",
    id: "user-luogu",
    name: "luogu",
    username: "luogu",
  });
  await db.insert(userOjAccount).values({
    handle: "forlight",
    id: "account-luogu",
    platform: "luogu",
    profileUrl: "https://www.luogu.com.cn/user/97238",
    userId: "user-luogu",
  });

  return {
    handle: "forlight",
    id: "account-luogu",
    profileUrl: "https://www.luogu.com.cn/user/97238",
  };
};

describe("Luogu sync", () => {
  it("writes stats and accepted problems from practice data", async () => {
    const db = await createServiceTestDb();
    const account = await createLuoguAccount(db);
    const now = new Date("2026-01-01T00:00:00.000Z");

    await syncLuoguAccountStats(db, account, now, async () =>
      createPractice(
        [
          { difficulty: 1, name: "A+B Problem", pid: "P1001", type: "P" },
          { difficulty: 7, name: "Hard Problem", pid: "P9999", type: "P" },
          {
            difficulty: null,
            name: "Unrated Problem",
            pid: "P0000",
            type: "P",
          },
        ],
        4
      )
    );

    const [stats] = await db.select().from(luoguAccountStats);
    const problems = await db
      .select()
      .from(luoguAcceptedProblem)
      .where(eq(luoguAcceptedProblem.accountId, account.id));

    expect(stats?.acceptedProblemCount).toBe(4);
    expect(stats?.acceptedWeightedScore).toBe(8);
    expect(stats?.averageAcceptedDifficulty).toBe(4);
    expect(stats?.fetchedAt?.toISOString()).toBe(now.toISOString());
    expect(stats?.lastError).toBeNull();
    expect(problems).toHaveLength(3);
  });

  it("replaces accepted problem snapshots on successful sync", async () => {
    const db = await createServiceTestDb();
    const account = await createLuoguAccount(db);
    const firstFetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const secondFetchedAt = new Date("2026-01-02T00:00:00.000Z");

    await syncLuoguAccountStats(db, account, firstFetchedAt, async () =>
      createPractice([
        { difficulty: 1, name: "A+B Problem", pid: "P1001", type: "P" },
        { difficulty: 2, name: "Old Problem", pid: "P1002", type: "P" },
      ])
    );
    await syncLuoguAccountStats(db, account, secondFetchedAt, async () =>
      createPractice([
        {
          difficulty: 3,
          name: "A+B Problem Updated",
          pid: "P1001",
          type: "P",
        },
      ])
    );

    const problems = await db
      .select()
      .from(luoguAcceptedProblem)
      .where(eq(luoguAcceptedProblem.accountId, account.id));

    expect(problems).toHaveLength(1);
    expect(problems[0]?.pid).toBe("P1001");
    expect(problems[0]?.name).toBe("A+B Problem Updated");
    expect(problems[0]?.difficulty).toBe(3);
  });

  it("records failures without deleting existing accepted problems", async () => {
    const db = await createServiceTestDb();
    const account = await createLuoguAccount(db);
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const failedAt = new Date("2026-01-02T00:00:00.000Z");

    await syncLuoguAccountStats(db, account, fetchedAt, async () =>
      createPractice([
        { difficulty: 1, name: "A+B Problem", pid: "P1001", type: "P" },
      ])
    );
    await markLuoguAccountStatsRefreshFailed(
      db,
      account,
      new Error("network failed"),
      failedAt
    );

    const [stats] = await db.select().from(luoguAccountStats);
    const problems = await db.select().from(luoguAcceptedProblem);

    expect(stats?.fetchedAt?.toISOString()).toBe(fetchedAt.toISOString());
    expect(stats?.lastAttemptedAt.toISOString()).toBe(failedAt.toISOString());
    expect(stats?.lastError).toBe("network failed");
    expect(problems).toHaveLength(1);
  });
});
