import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";
import { eq, sql } from "drizzle-orm";

import { createServiceTestDb } from "../test-db";
import { addOjAccount, deleteOjAccount, updateOjAccount } from "./commands";

type TestDatabase = Awaited<ReturnType<typeof createServiceTestDb>>;

const createUser = async (
  db: TestDatabase,
  input: {
    id: string;
    memberStatus?: MemberStatus;
  }
) => {
  await db.insert(user).values({
    email: `${input.id}@example.com`,
    id: input.id,
    memberStatus: input.memberStatus,
    name: input.id,
    username: input.id,
  });
};

const createCodeforcesAccountWithStats = async (db: TestDatabase) => {
  const fetchedAt = new Date();

  await createUser(db, { id: "active-user", memberStatus: "active" });
  await db.insert(userOjAccount).values({
    externalId: "old-handle",
    handle: "old-handle",
    id: "codeforces-account",
    platform: "codeforces",
    userId: "active-user",
  });
  await db.insert(codeforcesAccountStats).values({
    accountId: "codeforces-account",
    fetchedAt,
    lastAttemptedAt: fetchedAt,
    rating: 1200,
  });
  await db.insert(refreshRequest).values({
    kind: "codeforces.accountStats",
    targetId: "codeforces-account",
  });
};

describe("addOjAccount", () => {
  it("enqueues current-member stats refreshes", async () => {
    const db = await createServiceTestDb();

    await createUser(db, { id: "active-user", memberStatus: "active" });
    await createUser(db, { id: "active-luogu-user", memberStatus: "active" });
    await createUser(db, {
      id: "active-atcoder-user",
      memberStatus: "active",
    });
    await createUser(db, {
      id: "active-nowcoder-user",
      memberStatus: "active",
    });
    await createUser(db, { id: "retired-user", memberStatus: "retired" });
    await createUser(db, {
      id: "retired-luogu-user",
      memberStatus: "retired",
    });

    await addOjAccount(db, {
      externalId: "activeHandle",
      platform: "codeforces",
      userId: "active-user",
    });
    await addOjAccount(db, {
      externalId: "retiredHandle",
      platform: "codeforces",
      userId: "retired-user",
    });
    await addOjAccount(db, {
      externalId: "97238",
      platform: "luogu",
      userId: "active-luogu-user",
    });
    await addOjAccount(db, {
      externalId: "forlight",
      platform: "atcoder",
      userId: "active-atcoder-user",
    });
    await addOjAccount(db, {
      externalId: "660255087",
      platform: "nowcoder",
      userId: "active-nowcoder-user",
    });
    await addOjAccount(db, {
      externalId: "93247",
      platform: "luogu",
      userId: "retired-luogu-user",
    });

    const refreshRequests = await db.select().from(refreshRequest);
    const luoguAccounts = await db
      .select({
        externalId: userOjAccount.externalId,
        handle: userOjAccount.handle,
      })
      .from(userOjAccount)
      .where(eq(userOjAccount.platform, "luogu"));

    expect(refreshRequests).toHaveLength(5);
    expect(refreshRequests.map((request) => request.kind).sort()).toEqual([
      "atcoder.accountStats",
      "codeforces.accountStats",
      "luogu.accountStats",
      "nowcoder.accountStats",
      "user.awardsFromLuogu",
    ]);
    expect(luoguAccounts).toEqual(
      expect.arrayContaining([
        {
          externalId: "97238",
          handle: "97238",
        },
        {
          externalId: "93247",
          handle: "93247",
        },
      ])
    );
  });

  it("rejects the exact same external ID on the same platform", async () => {
    const db = await createServiceTestDb();

    await createUser(db, { id: "first-user" });
    await createUser(db, { id: "second-user" });

    await addOjAccount(db, {
      externalId: "same-id",
      platform: "atcoder",
      userId: "first-user",
    });

    await expect(
      addOjAccount(db, {
        externalId: "same-id",
        platform: "atcoder",
        userId: "second-user",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("allows matching display handles with different external IDs", async () => {
    const db = await createServiceTestDb();

    await createUser(db, { id: "first-user" });
    await createUser(db, { id: "second-user" });

    await db.insert(userOjAccount).values({
      externalId: "first-id",
      handle: "same-handle",
      platform: "nowcoder",
      userId: "first-user",
    });

    await expect(
      addOjAccount(db, {
        externalId: "second-id",
        platform: "nowcoder",
        userId: "second-user",
      })
    ).resolves.toMatchObject({
      externalId: "second-id",
      handle: "second-id",
    });
  });

  it("rolls back the account when refresh enqueueing fails", async () => {
    const db = await createServiceTestDb();
    await createUser(db, { id: "active-user", memberStatus: "active" });
    await db.run(sql`
      CREATE TRIGGER fail_refresh_request_insert
      BEFORE INSERT ON refresh_request
      BEGIN
        SELECT RAISE(ABORT, 'forced refresh insert failure');
      END
    `);

    await expect(
      addOjAccount(db, {
        externalId: "new-handle",
        platform: "codeforces",
        userId: "active-user",
      })
    ).rejects.toThrow();

    expect(await db.select().from(userOjAccount)).toEqual([]);
    expect(await db.select().from(refreshRequest)).toEqual([]);
  });
});

describe("updateOjAccount", () => {
  it("updates the identity, clears old stats, and requests a refresh", async () => {
    const db = await createServiceTestDb();
    await createCodeforcesAccountWithStats(db);

    await updateOjAccount(db, {
      externalId: "new-handle",
      platform: "codeforces",
      userId: "active-user",
    });

    const [account] = await db.select().from(userOjAccount);
    const stats = await db.select().from(codeforcesAccountStats);
    const requests = await db.select().from(refreshRequest);

    expect(account).toMatchObject({
      externalId: "new-handle",
      handle: "new-handle",
      id: "codeforces-account",
      platform: "codeforces",
      userId: "active-user",
    });
    expect(stats).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      kind: "codeforces.accountStats",
      targetId: "codeforces-account",
    });
  });

  it("rolls back the identity and effects when refresh enqueueing fails", async () => {
    const db = await createServiceTestDb();
    await createCodeforcesAccountWithStats(db);

    await db.run(sql`
      CREATE TRIGGER fail_refresh_request_insert
      BEFORE INSERT ON refresh_request
      BEGIN
        SELECT RAISE(ABORT, 'forced refresh insert failure');
      END
    `);

    await expect(
      updateOjAccount(db, {
        externalId: "new-handle",
        platform: "codeforces",
        userId: "active-user",
      })
    ).rejects.toThrow();

    const [account] = await db.select().from(userOjAccount);
    const stats = await db.select().from(codeforcesAccountStats);
    const requests = await db.select().from(refreshRequest);

    expect(account).toMatchObject({
      externalId: "old-handle",
      handle: "old-handle",
      id: "codeforces-account",
    });
    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      accountId: "codeforces-account",
      rating: 1200,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      kind: "codeforces.accountStats",
      targetId: "codeforces-account",
    });
  });
});

describe("deleteOjAccount", () => {
  it("deletes the account, stats, and refresh request", async () => {
    const db = await createServiceTestDb();
    await createCodeforcesAccountWithStats(db);

    await deleteOjAccount(db, {
      platform: "codeforces",
      userId: "active-user",
    });

    expect(await db.select().from(userOjAccount)).toEqual([]);
    expect(await db.select().from(codeforcesAccountStats)).toEqual([]);
    expect(await db.select().from(refreshRequest)).toEqual([]);
  });

  it("rolls back the deletion when refresh cleanup fails", async () => {
    const db = await createServiceTestDb();
    await createCodeforcesAccountWithStats(db);
    await db.run(sql`
      CREATE TRIGGER fail_refresh_request_delete
      BEFORE DELETE ON refresh_request
      BEGIN
        SELECT RAISE(ABORT, 'forced refresh delete failure');
      END
    `);

    await expect(
      deleteOjAccount(db, {
        platform: "codeforces",
        userId: "active-user",
      })
    ).rejects.toThrow();

    expect(await db.select().from(userOjAccount)).toHaveLength(1);
    expect(await db.select().from(codeforcesAccountStats)).toHaveLength(1);
    expect(await db.select().from(refreshRequest)).toHaveLength(1);
  });
});
