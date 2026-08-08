import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus, OjPlatform } from "@hhuacm-dashboard/domain";
import { sql } from "drizzle-orm";
import { createServiceTestDb } from "../test-db";
import { deleteAdminUser } from "./delete-user";
import { getAdminUser } from "./detail";
import { listAdminUsers } from "./list-query";
import type { Database } from "./types";

const createUser = async (
  db: Database,
  input: {
    email?: string;
    grade?: string;
    id: string;
    major?: string;
    memberStatus?: MemberStatus;
    realName?: string;
    role?: "admin" | "user";
    studentId?: string;
    username?: string;
  }
) => {
  await db.insert(user).values({
    email: input.email ?? `${input.id}@example.com`,
    id: input.id,
    name: input.id,
    role: input.role ?? "user",
    username: input.username ?? input.id,
  });

  if (
    input.grade ||
    input.major ||
    input.memberStatus ||
    input.realName ||
    input.studentId
  ) {
    await db.insert(userProfile).values({
      grade: input.grade,
      major: input.major,
      memberStatus: input.memberStatus,
      realName: input.realName,
      studentId: input.studentId,
      userId: input.id,
    });
  }
};

const createOjAccount = async (
  db: Database,
  input: {
    externalId?: string;
    handle?: string;
    platform: OjPlatform;
    userId: string;
  }
) => {
  const externalId =
    input.externalId ?? input.handle ?? `${input.userId}-${input.platform}`;
  const handle = input.handle ?? `${input.userId}-${input.platform}`;
  const id = `account-${input.userId}-${input.platform}`;

  await db.insert(userOjAccount).values({
    externalId,
    handle,
    id,
    platform: input.platform,
    userId: input.userId,
  });

  return id;
};

const listUserIds = async (db: Database) => {
  const users = await listAdminUsers(db);

  return users.map((item) => item.id);
};

describe("admin users", () => {
  it("lists users by default username order and attaches OJ accounts", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      id: "beta",
      memberStatus: "active",
      realName: "Beta",
    });
    await createUser(db, {
      id: "alpha",
      memberStatus: "selection",
      realName: "Alpha",
    });
    await createUser(db, {
      id: "no-profile",
    });
    await createOjAccount(db, { platform: "luogu", userId: "alpha" });
    await createOjAccount(db, { platform: "codeforces", userId: "alpha" });

    const users = await listAdminUsers(db);
    const alpha = users.find((item) => item.id === "alpha");
    const missingProfile = users.find((item) => item.id === "no-profile");

    expect(users.map((item) => item.id)).toEqual([
      "alpha",
      "beta",
      "no-profile",
    ]);
    expect(alpha?.ojAccounts.map((account) => account.platform)).toEqual([
      "codeforces",
      "luogu",
    ]);
    expect(missingProfile?.memberStatus).toBe("selection");
  });

  it("returns admin user details with default profile values", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      email: "detail@example.com",
      id: "detail-user",
      username: "detail",
    });
    await createOjAccount(db, {
      handle: "detailLuogu",
      platform: "luogu",
      userId: "detail-user",
    });

    const result = await getAdminUser(db, "detail-user");

    expect(result.username).toBe("detail");
    expect(result.profile).toEqual({
      grade: null,
      major: null,
      memberStatus: "selection",
      realName: null,
      studentId: null,
    });
    expect(result.ojAccounts).toEqual([
      {
        externalId: "detailLuogu",
        handle: "detailLuogu",
        platform: "luogu",
      },
    ]);
  });

  it("rejects deleting admins, non-frozen users, and wrong confirmations", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      id: "admin-user",
      memberStatus: "frozen",
      role: "admin",
    });
    await createUser(db, {
      id: "active-user",
      memberStatus: "active",
    });
    await createUser(db, {
      id: "frozen-user",
      memberStatus: "frozen",
      username: "frozen-user",
    });

    await expect(
      deleteAdminUser(db, {
        userId: "admin-user",
        usernameConfirmation: "admin-user",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      deleteAdminUser(db, {
        userId: "active-user",
        usernameConfirmation: "active-user",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      deleteAdminUser(db, {
        userId: "frozen-user",
        usernameConfirmation: "wrong",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deletes frozen users and clears all OJ refresh requests", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      id: "frozen-user",
      memberStatus: "frozen",
      username: "frozen-user",
    });
    const atcoderAccountId = await createOjAccount(db, {
      platform: "atcoder",
      userId: "frozen-user",
    });
    const codeforcesAccountId = await createOjAccount(db, {
      platform: "codeforces",
      userId: "frozen-user",
    });
    const luoguAccountId = await createOjAccount(db, {
      platform: "luogu",
      userId: "frozen-user",
    });
    const nowcoderAccountId = await createOjAccount(db, {
      platform: "nowcoder",
      userId: "frozen-user",
    });
    await db.insert(codeforcesAccountStats).values({
      accountId: codeforcesAccountId,
      lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await db.insert(refreshRequest).values([
      {
        kind: "atcoder.accountStats",
        targetId: atcoderAccountId,
      },
      {
        kind: "codeforces.accountStats",
        targetId: codeforcesAccountId,
      },
      {
        kind: "luogu.accountStats",
        targetId: luoguAccountId,
      },
      {
        kind: "user.awardsFromLuogu",
        targetId: luoguAccountId,
      },
      {
        kind: "nowcoder.accountStats",
        targetId: nowcoderAccountId,
      },
    ]);

    const deleted = await deleteAdminUser(db, {
      userId: "frozen-user",
      usernameConfirmation: "frozen-user",
    });
    const users = await listUserIds(db);
    const stats = await db.select().from(codeforcesAccountStats);
    const refreshRequests = await db.select().from(refreshRequest);

    expect(deleted.id).toBe("frozen-user");
    expect(users).toEqual([]);
    expect(stats).toEqual([]);
    expect(refreshRequests).toEqual([]);
  });

  it("restores refresh requests when user deletion fails", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      id: "frozen-user",
      memberStatus: "frozen",
      username: "frozen-user",
    });
    const codeforcesAccountId = await createOjAccount(db, {
      platform: "codeforces",
      userId: "frozen-user",
    });
    await db.insert(refreshRequest).values({
      kind: "codeforces.accountStats",
      targetId: codeforcesAccountId,
    });
    await db.run(sql`
      CREATE TRIGGER fail_user_delete
      BEFORE DELETE ON user
      BEGIN
        SELECT RAISE(ABORT, 'forced user delete failure');
      END
    `);

    await expect(
      deleteAdminUser(db, {
        userId: "frozen-user",
        usernameConfirmation: "frozen-user",
      })
    ).rejects.toThrow();

    expect(await listUserIds(db)).toEqual(["frozen-user"]);
    expect(await db.select().from(userOjAccount)).toHaveLength(1);
    expect(await db.select().from(refreshRequest)).toHaveLength(1);
  });
});
