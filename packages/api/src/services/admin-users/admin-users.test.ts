import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import type { MemberStatus, OjPlatform } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { deleteAdminUser } from "./delete-user";
import { getAdminUser } from "./detail";
import { listAdminUsers } from "./list-query";
import { getAdminUsersMetadata } from "./metadata";
import type { Database } from "./types";

const createUser = async (
  db: Database,
  input: {
    email?: string;
    grade?: string;
    id: string;
    major?: string;
    memberStatus?: MemberStatus;
    name?: string;
    realName?: string;
    role?: "admin" | "member";
    studentId?: string;
    username?: null | string;
  }
) => {
  await db.insert(user).values({
    email: input.email ?? `${input.id}@example.com`,
    id: input.id,
    name: input.name ?? input.id,
    role: input.role ?? "member",
    username: input.username === undefined ? input.id : input.username,
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
    handle?: string;
    platform: OjPlatform;
    userId: string;
  }
) => {
  const handle = input.handle ?? `${input.userId}-${input.platform}`;
  const id = `account-${input.userId}-${input.platform}`;

  await db.insert(userOjAccount).values({
    handle,
    id,
    normalizedHandle: handle.toLowerCase(),
    platform: input.platform,
    profileUrl: `https://example.com/${input.platform}/${handle}`,
    userId: input.userId,
  });

  return id;
};

const listUserIds = async (db: Database) => {
  const result = await listAdminUsers(db, {
    page: 1,
    pageSize: 20,
  });

  return result.items.map((item) => item.id);
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

    const result = await listAdminUsers(db, {
      page: 1,
      pageSize: 20,
    });
    const alpha = result.items.find((item) => item.id === "alpha");
    const missingProfile = result.items.find(
      (item) => item.id === "no-profile"
    );

    expect(result.items.map((item) => item.id)).toEqual([
      "alpha",
      "beta",
      "no-profile",
    ]);
    expect(result.total).toBe(3);
    expect(alpha?.ojAccounts.map((account) => account.platform)).toEqual([
      "codeforces",
      "luogu",
    ]);
    expect(missingProfile?.memberStatus).toBe("selection");
  });

  it("sorts users by a selected profile column", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      grade: "2025级",
      id: "young",
      realName: "Young",
    });
    await createUser(db, {
      grade: "2023级",
      id: "senior",
      realName: "Senior",
    });

    const result = await listAdminUsers(db, {
      page: 1,
      pageSize: 20,
      sort: {
        column: "grade",
        direction: "descending",
      },
    });

    expect(result.items.map((item) => item.id)).toEqual(["young", "senior"]);
  });

  it("filters users by member status, grade, and OJ platform", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      grade: "2024级",
      id: "target",
      memberStatus: "active",
    });
    await createUser(db, {
      grade: "2024级",
      id: "missing-platform",
      memberStatus: "active",
    });
    await createUser(db, {
      grade: "2023级",
      id: "wrong-grade",
      memberStatus: "active",
    });
    await createUser(db, {
      grade: "2024级",
      id: "wrong-status",
      memberStatus: "retired",
    });
    await createOjAccount(db, { platform: "codeforces", userId: "target" });
    await createOjAccount(db, {
      platform: "luogu",
      userId: "missing-platform",
    });

    const result = await listAdminUsers(db, {
      filters: {
        grades: ["2024级"],
        memberStatuses: ["active"],
        ojPlatforms: ["codeforces"],
      },
      page: 1,
      pageSize: 20,
    });

    expect(result.items.map((item) => item.id)).toEqual(["target"]);
    expect(result.total).toBe(1);
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
        handle: "detailLuogu",
        platform: "luogu",
        profileUrl: "https://example.com/luogu/detailLuogu",
      },
    ]);
  });

  it("returns admin users metadata", async () => {
    const db = await createServiceTestDb();
    await createUser(db, { grade: "2024级", id: "a" });
    await createUser(db, { grade: "2023级", id: "b" });
    await createUser(db, { id: "c" });

    const metadata = await getAdminUsersMetadata(db);

    expect(metadata.grades).toEqual([
      { label: "2023级", value: "2023级" },
      { label: "2024级", value: "2024级" },
    ]);
    expect(metadata.memberStatuses.map((status) => status.value)).toEqual([
      "selection",
      "active",
      "retired",
      "frozen",
    ]);
    expect(metadata.ojPlatforms.map((platform) => platform.value)).toEqual([
      "luogu",
      "codeforces",
      "atcoder",
      "nowcoder",
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

  it("deletes frozen users and clears Codeforces stats", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      id: "frozen-user",
      memberStatus: "frozen",
      username: "frozen-user",
    });
    const accountId = await createOjAccount(db, {
      platform: "codeforces",
      userId: "frozen-user",
    });
    await db.insert(codeforcesAccountStats).values({
      accountId,
      handle: "frozen-user-codeforces",
      lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await db.insert(refreshJob).values({
      kind: "codeforces.accountStats",
      status: "pending",
      targetId: accountId,
    });

    const deleted = await deleteAdminUser(db, {
      userId: "frozen-user",
      usernameConfirmation: "frozen-user",
    });
    const users = await listUserIds(db);
    const stats = await db.select().from(codeforcesAccountStats);
    const refreshJobs = await db.select().from(refreshJob);

    expect(deleted.id).toBe("frozen-user");
    expect(users).toEqual([]);
    expect(stats).toEqual([]);
    expect(refreshJobs).toEqual([]);
  });
});
