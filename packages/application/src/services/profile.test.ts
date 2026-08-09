import { describe, expect, it } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import {
  userAward,
  userAwardSync,
} from "@hhuacm-dashboard/db/schema/user-award";

import { getPublicProfile } from "./profile";
import { createServiceTestDb } from "./test-db";

describe("getPublicProfile", () => {
  it("returns inactive users' accounts and cached awards without refresh requests", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");

    await db.insert(user).values({
      email: "retired@example.com",
      id: "user-retired",
      memberStatus: "retired",
      name: "retired",
      username: "retired",
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
    await db.insert(userAwardSync).values({
      fetchedAt,
      source: "luogu",
      userId: "user-retired",
    });
    await db.insert(userAward).values({
      contest: "ICPC Regional",
      event: "第 48 届 ICPC 国际大学生程序设计竞赛区域赛济南站",
      level: "铜牌",
      sortOrder: 0,
      source: "luogu",
      userId: "user-retired",
      year: 2023,
    });

    const profile = await getPublicProfile(db, {
      currentUserId: null,
      username: "retired",
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
          tier: "bronze",
          year: 2023,
        },
      ],
      syncStatus: "ready",
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

  it("returns failed AtCoder and Nowcoder stats without losing cached values", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date();

    await db.insert(user).values({
      email: "failed-oj@example.com",
      id: "user-failed-oj",
      memberStatus: "active",
      name: "failed oj",
      username: "failed-oj",
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
      lastError: "AtCoder unavailable",
      rating: 3857,
      recentPerformanceAverage: 3612,
    });
    await db.insert(nowcoderAccountStats).values({
      acceptedProblemCount: 246,
      accountId: "account-failed-nowcoder",
      fetchedAt,
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
