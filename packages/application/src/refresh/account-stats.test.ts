import { describe, expect, it } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import {
  type MemberStatus,
  type OjPlatform,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";

import { createServiceTestDb } from "../services/test-db";
import {
  accountStatsRefreshHandlers,
  accountStatsRefreshKindByPlatform,
  enqueueDueAccountStatsRequests,
  ensureAccountStatsRefreshes,
} from "./account-stats";

type TestDb = Awaited<ReturnType<typeof createServiceTestDb>>;

const insertStats = async (
  db: TestDb,
  platform: OjPlatform,
  accountId: string,
  fetchedAt: Date
) => {
  if (platform === "atcoder") {
    await db.insert(atcoderAccountStats).values({ accountId, fetchedAt });
  } else if (platform === "codeforces") {
    await db.insert(codeforcesAccountStats).values({ accountId, fetchedAt });
  } else if (platform === "luogu") {
    await db.insert(luoguAccountStats).values({ accountId, fetchedAt });
  } else {
    await db.insert(nowcoderAccountStats).values({ accountId, fetchedAt });
  }
};

const createAccount = async (
  db: TestDb,
  input: {
    fetchedAt?: Date;
    id: string;
    memberStatus: MemberStatus;
    platform: OjPlatform;
  }
) => {
  await db.insert(user).values({
    email: `${input.id}@example.com`,
    id: input.id,
    memberStatus: input.memberStatus,
    name: input.id,
    username: input.id,
  });

  const accountId = `account-${input.id}`;
  await db.insert(userOjAccount).values({
    externalId: input.id,
    handle: input.id,
    id: accountId,
    platform: input.platform,
    userId: input.id,
  });

  if (input.fetchedAt) {
    await insertStats(db, input.platform, accountId, input.fetchedAt);
  }
};

describe("account stats refresh scheduling", () => {
  it("reports fresh stats as ready and queues only missing or expired stats", async () => {
    const db = await createServiceTestDb();
    const now = new Date("2026-01-01T02:00:00.000Z");
    const freshFetchedAt = new Date("2026-01-01T01:30:00.000Z");
    const expiredFetchedAt = new Date("2026-01-01T00:59:00.000Z");
    const accounts = [
      {
        accountId: "account-codeforces-fresh",
        fetchedAt: freshFetchedAt,
        lastError: null,
      },
      {
        accountId: "account-codeforces-missing",
        fetchedAt: null,
        lastError: null,
      },
      {
        accountId: "account-codeforces-expired",
        fetchedAt: expiredFetchedAt,
        lastError: null,
      },
    ];

    const refresh = await ensureAccountStatsRefreshes(db, {
      accounts,
      now,
      platform: "codeforces",
    });
    const requests = await db.select().from(refreshRequest);

    expect(
      accounts.map((account) => [
        account.accountId,
        refresh.syncStatusOf(account),
      ])
    ).toEqual([
      ["account-codeforces-fresh", "ready"],
      ["account-codeforces-missing", "refreshing"],
      ["account-codeforces-expired", "refreshing"],
    ]);
    expect(
      requests
        .map((request) => `${request.kind}:${request.targetId}`)
        .toSorted()
    ).toEqual([
      "codeforces.accountStats:account-codeforces-expired",
      "codeforces.accountStats:account-codeforces-missing",
    ]);
  });

  it("enqueues missing and expired stats for current members on every platform", async () => {
    const db = await createServiceTestDb();
    const now = new Date("2026-01-01T02:00:00.000Z");

    for (const platform of ojPlatforms) {
      await createAccount(db, {
        id: `${platform}-selection`,
        memberStatus: "selection",
        platform,
      });
      await createAccount(db, {
        id: `${platform}-active`,
        memberStatus: "active",
        platform,
      });
      await createAccount(db, {
        fetchedAt: new Date("2026-01-01T01:30:00.000Z"),
        id: `${platform}-fresh`,
        memberStatus: "active",
        platform,
      });
      await createAccount(db, {
        fetchedAt: new Date("2026-01-01T00:59:00.000Z"),
        id: `${platform}-expired`,
        memberStatus: "active",
        platform,
      });
      await createAccount(db, {
        id: `${platform}-retired`,
        memberStatus: "retired",
        platform,
      });
      await createAccount(db, {
        id: `${platform}-frozen`,
        memberStatus: "frozen",
        platform,
      });
    }

    await enqueueDueAccountStatsRequests(db, now);

    const requests = await db.select().from(refreshRequest);
    const actual = requests
      .map((request) => `${request.kind}:${request.targetId}`)
      .toSorted();
    const expected = ojPlatforms
      .flatMap((platform) =>
        ["active", "expired", "selection"].map(
          (state) =>
            `${accountStatsRefreshKindByPlatform[platform]}:account-${platform}-${state}`
        )
      )
      .toSorted();

    expect(actual).toEqual(expected);
  });
});

describe("account stats refresh handling", () => {
  it("records invalid Luogu IDs without rejecting the handled request", async () => {
    const db = await createServiceTestDb();
    await db.insert(user).values({
      email: "luogu-failure@example.com",
      id: "luogu-failure",
      memberStatus: "active",
      name: "luogu-failure",
      username: "luogu-failure",
    });
    await db.insert(userOjAccount).values({
      externalId: "invalid-luogu-id",
      handle: "invalid-luogu-id",
      id: "account-luogu-failure",
      platform: "luogu",
      userId: "luogu-failure",
    });

    await expect(
      accountStatsRefreshHandlers[accountStatsRefreshKindByPlatform.luogu](
        db,
        "account-luogu-failure"
      )
    ).resolves.toBeUndefined();

    const [stats] = await db
      .select()
      .from(luoguAccountStats)
      .where(eq(luoguAccountStats.accountId, "account-luogu-failure"));

    expect(stats?.fetchedAt).toBeNull();
    expect(stats?.lastError).toBe("Luogu UID is missing");
  });
});
