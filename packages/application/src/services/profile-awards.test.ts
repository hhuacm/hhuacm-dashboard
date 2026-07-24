import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";

import type { LuoguUserPageData } from "../external/online-judge-sources/luogu/api";
import {
  classifyAwardLevel,
  getAwardsForPublicProfile,
  markUserAwardsFromLuoguRefreshFailed,
  selectLuoguUserAwards,
  syncUserAwardsFromLuogu,
} from "./profile-awards";
import { createServiceTestDb } from "./test-db";

const createLuoguUserPage = (
  prizes: LuoguUserPageData["prizes"]
): LuoguUserPageData => ({
  dailyCounts: [],
  elo: [],
  gu: {
    scores: {
      basic: 0,
      contest: 0,
      practice: 0,
      prize: 20,
      rating: 0,
      social: 0,
    },
  },
  prizes,
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
    passedProblemCount: 436,
    prize: [],
    ranking: null,
    registerTime: 0,
    slogan: "",
    submittedProblemCount: 489,
    uid: 97_238,
    xcpcLevel: 0,
  },
});

const createUser = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>
) => {
  await db.insert(user).values({
    email: "award@example.com",
    id: "user-award",
    name: "award",
    username: "award",
  });
};

const account = {
  externalId: "97238",
  handle: "forlight",
  id: "account-luogu",
  userId: "user-award",
};

describe("profile awards", () => {
  it("classifies award tiers from source labels", () => {
    expect(classifyAwardLevel("金牌")).toBe("gold");
    expect(classifyAwardLevel("二等奖")).toBe("silver");
    expect(classifyAwardLevel("铜牌")).toBe("bronze");
    expect(classifyAwardLevel("优胜奖")).toBe("default");
  });

  it("selects public awards from Luogu user page data", () => {
    const awards = selectLuoguUserAwards(
      createLuoguUserPage([
        {
          prize: {
            contest: "NOIP 提高组",
            event: null,
            prize: "二等奖",
            year: 2018,
          },
        },
        {
          prize: {
            contest: "ICPC Regional",
            event: "第 48 届 ICPC 国际大学生程序设计竞赛区域赛济南站",
            prize: "铜牌",
            year: 2023,
          },
        },
      ])
    );

    expect(awards).toEqual([
      {
        contest: "NOIP 提高组",
        event: null,
        level: "二等奖",
        sortOrder: 0,
        year: 2018,
      },
      {
        contest: "ICPC Regional",
        event: "第 48 届 ICPC 国际大学生程序设计竞赛区域赛济南站",
        level: "铜牌",
        sortOrder: 1,
        year: 2023,
      },
    ]);
  });

  it("replaces Luogu awards and writes sync status", async () => {
    const db = await createServiceTestDb();
    const firstFetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const secondFetchedAt = new Date("2026-01-02T00:00:00.000Z");
    await createUser(db);

    await syncUserAwardsFromLuogu(db, account, firstFetchedAt, async () =>
      createLuoguUserPage([
        {
          prize: {
            contest: "Old Contest",
            event: null,
            prize: "铜牌",
            year: 2020,
          },
        },
      ])
    );
    await syncUserAwardsFromLuogu(db, account, secondFetchedAt, async () =>
      createLuoguUserPage([
        {
          prize: {
            contest: "New Contest",
            event: "Final",
            prize: "银牌",
            year: 2021,
          },
        },
      ])
    );

    const awards = await db.select().from(userAward);
    const [sync] = await db.select().from(userAwardSync);

    expect(awards).toHaveLength(1);
    expect(awards[0]?.contest).toBe("New Contest");
    expect(awards[0]?.event).toBe("Final");
    expect(awards[0]?.level).toBe("银牌");
    expect(sync?.fetchedAt?.toISOString()).toBe(secondFetchedAt.toISOString());
    expect(sync?.lastError).toBeNull();
  });

  it("clears old Luogu awards on a successful empty refresh", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    await createUser(db);

    await syncUserAwardsFromLuogu(db, account, fetchedAt, async () =>
      createLuoguUserPage([
        {
          prize: {
            contest: "Old Contest",
            event: null,
            prize: "铜牌",
            year: 2020,
          },
        },
      ])
    );
    await syncUserAwardsFromLuogu(db, account, fetchedAt, async () =>
      createLuoguUserPage([])
    );

    const awards = await db.select().from(userAward);
    const [sync] = await db.select().from(userAwardSync);

    expect(awards).toHaveLength(0);
    expect(sync?.fetchedAt?.toISOString()).toBe(fetchedAt.toISOString());
    expect(sync?.lastError).toBeNull();
  });

  it("records failures without deleting cached awards", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const failedAt = new Date("2026-01-02T00:00:00.000Z");
    await createUser(db);

    await syncUserAwardsFromLuogu(db, account, fetchedAt, async () =>
      createLuoguUserPage([
        {
          prize: {
            contest: "Cached Contest",
            event: null,
            prize: "铜牌",
            year: 2020,
          },
        },
      ])
    );
    await markUserAwardsFromLuoguRefreshFailed(
      db,
      account,
      new Error("network failed"),
      failedAt
    );

    const awards = await db.select().from(userAward);
    const [sync] = await db.select().from(userAwardSync);

    expect(awards).toHaveLength(1);
    expect(awards[0]?.contest).toBe("Cached Contest");
    expect(sync?.fetchedAt?.toISOString()).toBe(fetchedAt.toISOString());
    expect(sync?.lastAttemptedAt.toISOString()).toBe(failedAt.toISOString());
    expect(sync?.lastError).toBe("network failed");
  });

  it("returns public awards and enqueues refresh when due", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    await createUser(db);
    await syncUserAwardsFromLuogu(db, account, fetchedAt, async () =>
      createLuoguUserPage([
        {
          prize: {
            contest: "Cached Contest",
            event: null,
            prize: "铜牌",
            year: 2020,
          },
        },
      ])
    );

    const awards = await getAwardsForPublicProfile(db, {
      canRefresh: true,
      luoguAccountId: "account-luogu",
      now: new Date("2026-01-01T01:01:00.000Z"),
      userId: "user-award",
    });

    expect(awards.syncStatus).toBe("refreshing");
    expect(awards.fetchedAt).toBe(fetchedAt.toISOString());
    expect(awards.items).toEqual([
      {
        contest: "Cached Contest",
        event: null,
        level: "铜牌",
        sortOrder: 0,
        source: "luogu",
        tier: "bronze",
        year: 2020,
      },
    ]);
  });
});
