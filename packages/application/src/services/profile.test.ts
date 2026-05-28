import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
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
        platform: "codeforces",
      },
      {
        externalId: "12345",
        handle: "12345",
        platform: "luogu",
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
});
