import { describe, expect, it } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";

import { getPublicProfile } from "./profile";
import { createServiceTestDb } from "./test-db";

describe("getPublicProfile", () => {
  it("returns inactive users' bound OJ accounts without stats or refresh requests", async () => {
    const db = await createServiceTestDb();

    await db.insert(user).values({
      email: "retired@example.com",
      id: "user-retired",
      name: "retired",
      username: "retired",
    });
    await db.insert(userProfile).values({
      memberStatus: "retired",
      userId: "user-retired",
    });
    await db.insert(userOjAccount).values([
      {
        externalId: "tourist",
        handle: "tourist",
        id: "account-atcoder",
        platform: "atcoder",
        userId: "user-retired",
      },
      {
        externalId: "tourist",
        handle: "tourist",
        id: "account-codeforces",
        platform: "codeforces",
        userId: "user-retired",
      },
      {
        externalId: "12345",
        handle: "12345",
        id: "account-luogu",
        platform: "luogu",
        userId: "user-retired",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        id: "account-nowcoder",
        platform: "nowcoder",
        userId: "user-retired",
      },
    ]);

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "retired",
    });
    const refreshRequests = await db.select().from(refreshRequest);

    expect(profile.awards).toEqual({
      fetchedAt: null,
      items: [],
      syncStatus: "empty",
    });
    expect(profile.profile.memberStatus).toBe("retired");
    expect(profile.ojAccounts).toEqual([
      {
        externalId: "tourist",
        handle: "tourist",
        platform: "atcoder",
      },
      {
        externalId: "tourist",
        handle: "tourist",
        platform: "codeforces",
      },
      {
        externalId: "12345",
        handle: "12345",
        platform: "luogu",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        platform: "nowcoder",
      },
    ]);
    expect(refreshRequests).toHaveLength(0);
  });

  it("returns retired users' cached awards without refresh requests", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");

    await db.insert(user).values({
      email: "retired-award@example.com",
      id: "user-retired-award",
      name: "retired award",
      username: "retired-award",
    });
    await db.insert(userProfile).values({
      memberStatus: "retired",
      userId: "user-retired-award",
    });
    await db.insert(userOjAccount).values({
      externalId: "97238",
      handle: "forlight",
      id: "account-luogu-award",
      platform: "luogu",
      userId: "user-retired-award",
    });
    await db.insert(userAwardSync).values({
      fetchedAt,
      lastAttemptedAt: fetchedAt,
      source: "luogu",
      userId: "user-retired-award",
    });
    await db.insert(userAward).values({
      contest: "ICPC Regional",
      event: "第 48 届 ICPC 国际大学生程序设计竞赛区域赛济南站",
      level: "铜牌",
      sortOrder: 0,
      source: "luogu",
      userId: "user-retired-award",
      year: 2023,
    });

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "retired-award",
    });
    const refreshRequests = await db.select().from(refreshRequest);

    expect(profile.awards).toEqual({
      fetchedAt: fetchedAt.toISOString(),
      items: [
        {
          contest: "ICPC Regional",
          event: "第 48 届 ICPC 国际大学生程序设计竞赛区域赛济南站",
          level: "铜牌",
          sortOrder: 0,
          source: "luogu",
          year: 2023,
        },
      ],
      syncStatus: "ready",
    });
    expect(refreshRequests).toHaveLength(0);
  });

  it("enqueues missing awards refresh for current members", async () => {
    const db = await createServiceTestDb();

    await db.insert(user).values({
      email: "active-award@example.com",
      id: "user-active-award",
      name: "active award",
      username: "active-award",
    });
    await db.insert(userProfile).values({
      memberStatus: "active",
      userId: "user-active-award",
    });
    await db.insert(userOjAccount).values({
      externalId: "97238",
      handle: "forlight",
      id: "account-luogu-active-award",
      platform: "luogu",
      userId: "user-active-award",
    });

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "active-award",
    });
    const refreshRequests = await db.select().from(refreshRequest);

    expect(profile.awards.syncStatus).toBe("refreshing");
    expect(refreshRequests.map((request) => request.kind)).toEqual([
      "luogu.accountStats",
      "user.awardsFromLuogu",
    ]);
  });

  it("returns empty AtCoder and Nowcoder stats and enqueues refresh for current members", async () => {
    const db = await createServiceTestDb();

    await db.insert(user).values({
      email: "active-oj@example.com",
      id: "user-active-oj",
      name: "active oj",
      username: "active-oj",
    });
    await db.insert(userProfile).values({
      memberStatus: "active",
      userId: "user-active-oj",
    });
    await db.insert(userOjAccount).values([
      {
        externalId: "tourist",
        handle: "tourist",
        id: "account-active-atcoder",
        platform: "atcoder",
        userId: "user-active-oj",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        id: "account-active-nowcoder",
        platform: "nowcoder",
        userId: "user-active-oj",
      },
    ]);

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "active-oj",
    });
    const refreshRequests = await db.select().from(refreshRequest);

    expect(profile.ojAccounts).toEqual([
      {
        atcoder: {
          fetchedAt: null,
          rating: null,
          recentPerformanceAverage: null,
          syncStatus: "refreshing",
        },
        externalId: "tourist",
        handle: "tourist",
        platform: "atcoder",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        nowcoder: {
          acceptedProblemCount: null,
          fetchedAt: null,
          rating: null,
          syncStatus: "refreshing",
        },
        platform: "nowcoder",
      },
    ]);
    expect(refreshRequests.map((request) => request.kind)).toEqual([
      "atcoder.accountStats",
      "nowcoder.accountStats",
    ]);
  });

  it("returns ready AtCoder and Nowcoder cached stats for current members", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date();

    await db.insert(user).values({
      email: "cached-oj@example.com",
      id: "user-cached-oj",
      name: "cached oj",
      username: "cached-oj",
    });
    await db.insert(userProfile).values({
      memberStatus: "active",
      userId: "user-cached-oj",
    });
    await db.insert(userOjAccount).values([
      {
        externalId: "tourist",
        handle: "tourist",
        id: "account-cached-atcoder",
        platform: "atcoder",
        userId: "user-cached-oj",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        id: "account-cached-nowcoder",
        platform: "nowcoder",
        userId: "user-cached-oj",
      },
    ]);
    await db.insert(atcoderAccountStats).values({
      accountId: "account-cached-atcoder",
      fetchedAt,
      lastAttemptedAt: fetchedAt,
      rating: 3857,
      recentPerformanceAverage: 3612,
    });
    await db.insert(nowcoderAccountStats).values({
      acceptedProblemCount: 246,
      accountId: "account-cached-nowcoder",
      fetchedAt,
      lastAttemptedAt: fetchedAt,
      rating: 1725.5,
    });

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "cached-oj",
    });
    const refreshRequests = await db.select().from(refreshRequest);

    expect(profile.ojAccounts).toEqual([
      {
        atcoder: {
          fetchedAt: fetchedAt.toISOString(),
          rating: 3857,
          recentPerformanceAverage: 3612,
          syncStatus: "ready",
        },
        externalId: "tourist",
        handle: "tourist",
        platform: "atcoder",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        nowcoder: {
          acceptedProblemCount: 246,
          fetchedAt: fetchedAt.toISOString(),
          rating: 1725.5,
          syncStatus: "ready",
        },
        platform: "nowcoder",
      },
    ]);
    expect(refreshRequests).toHaveLength(0);
  });

  it("returns failed AtCoder and Nowcoder stats without losing cached values", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date();
    const lastAttemptedAt = new Date(fetchedAt.getTime() + 1000);

    await db.insert(user).values({
      email: "failed-oj@example.com",
      id: "user-failed-oj",
      name: "failed oj",
      username: "failed-oj",
    });
    await db.insert(userProfile).values({
      memberStatus: "active",
      userId: "user-failed-oj",
    });
    await db.insert(userOjAccount).values([
      {
        externalId: "tourist",
        handle: "tourist",
        id: "account-failed-atcoder",
        platform: "atcoder",
        userId: "user-failed-oj",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        id: "account-failed-nowcoder",
        platform: "nowcoder",
        userId: "user-failed-oj",
      },
    ]);
    await db.insert(atcoderAccountStats).values({
      accountId: "account-failed-atcoder",
      fetchedAt,
      lastAttemptedAt,
      lastError: "AtCoder unavailable",
      rating: 3857,
      recentPerformanceAverage: 3612,
    });
    await db.insert(nowcoderAccountStats).values({
      acceptedProblemCount: 246,
      accountId: "account-failed-nowcoder",
      fetchedAt,
      lastAttemptedAt,
      lastError: "Nowcoder unavailable",
      rating: 1725.5,
    });

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "failed-oj",
    });

    expect(profile.ojAccounts).toEqual([
      {
        atcoder: {
          fetchedAt: fetchedAt.toISOString(),
          rating: 3857,
          recentPerformanceAverage: 3612,
          syncStatus: "failed",
        },
        externalId: "tourist",
        handle: "tourist",
        platform: "atcoder",
      },
      {
        externalId: "98765",
        handle: "nowcoder",
        nowcoder: {
          acceptedProblemCount: 246,
          fetchedAt: fetchedAt.toISOString(),
          rating: 1725.5,
          syncStatus: "failed",
        },
        platform: "nowcoder",
      },
    ]);
  });
});
