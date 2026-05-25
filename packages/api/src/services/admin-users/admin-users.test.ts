import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { siteSetting } from "@hhuacm-dashboard/db/schema/site-setting";
import type { MemberStatus, OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";
import { exportAdminSystem } from "../admin-export";
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

const createProblemSetSeed = async (
  db: Database,
  input: {
    descriptionMarkdown?: string;
    id: string;
    problems: Array<{
      difficulty?: number;
      pid: string;
      title?: string;
    }>;
    title: string;
  }
) => {
  await db.insert(problemSet).values({
    descriptionMarkdown: input.descriptionMarkdown ?? "",
    id: input.id,
    title: input.title,
  });

  await db.insert(problemSetProblem).values(
    input.problems.map((problem, sortOrder) => ({
      difficulty: problem.difficulty,
      pid: problem.pid,
      problemSetId: input.id,
      sortOrder,
      title: problem.title,
    }))
  );
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

  it("exports an empty system seed with a stable content hash", async () => {
    const db = await createServiceTestDb();

    const firstExport = await exportAdminSystem(db);
    const secondExport = await exportAdminSystem(db);

    expect(firstExport).toMatchObject({
      kind: "hhuacm-dashboard.system-seed",
      seed: {
        problemSets: [],
        settings: {},
        users: [],
      },
      version: 1,
    });
    expect(firstExport.hash).toBe(secondExport.hash);
    expect(firstExport.exportedAt).not.toBe("");
  });

  it("exports users as a minimal seed with stable ordering", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      email: "beta@example.com",
      id: "beta",
      username: "beta",
    });
    await createUser(db, {
      email: "alpha@example.com",
      grade: "2024级",
      id: "alpha",
      memberStatus: "active",
      realName: "Alpha",
      role: "admin",
      username: "alpha",
    });
    await createOjAccount(db, {
      handle: "alphaLuogu",
      platform: "luogu",
      userId: "alpha",
    });
    await createOjAccount(db, {
      handle: "alphaCf",
      platform: "codeforces",
      userId: "alpha",
    });

    const result = await exportAdminSystem(db);

    expect(
      result.seed.users.map((exportedUser) => exportedUser.username)
    ).toEqual(["alpha", "beta"]);
    expect(result.seed.users[0]).toEqual({
      email: "alpha@example.com",
      ojAccounts: [
        {
          handle: "alphaCf",
          platform: "codeforces",
        },
        {
          handle: "alphaLuogu",
          platform: "luogu",
        },
      ],
      profile: {
        grade: "2024级",
        memberStatus: "active",
        realName: "Alpha",
      },
      role: "admin",
      username: "alpha",
    });
    expect(result.seed.users[1]).toEqual({
      email: "beta@example.com",
      username: "beta",
    });
  });

  it("keeps the export hash stable across exportedAt changes", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      grade: "2024级",
      id: "stable-user",
      realName: "Stable",
    });

    const firstExport = await exportAdminSystem(db);
    const secondExport = await exportAdminSystem(db);

    expect(firstExport.hash).toBe(secondExport.hash);
  });

  it("exports problem sets with PID order and without derived details", async () => {
    const db = await createServiceTestDb();
    await createProblemSetSeed(db, {
      descriptionMarkdown: "训练说明",
      id: "set-a",
      problems: [
        {
          difficulty: 2,
          pid: "P1563",
          title: "玩具谜题",
        },
        {
          difficulty: 1,
          pid: "P1001",
          title: "A+B Problem",
        },
      ],
      title: "基础题单",
    });
    await createProblemSetSeed(db, {
      id: "set-b",
      problems: [
        {
          difficulty: 0,
          pid: "P0000",
          title: "暂无评定",
        },
      ],
      title: "空描述题单",
    });

    const result = await exportAdminSystem(db);

    expect(result.seed.problemSets).toEqual([
      {
        descriptionMarkdown: "训练说明",
        pids: ["P1563", "P1001"],
        title: "基础题单",
      },
      {
        pids: ["P0000"],
        title: "空描述题单",
      },
    ]);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("玩具谜题");
    expect(serialized).not.toContain("difficulty");
  });

  it("exports only non-default settings", async () => {
    const defaultDb = await createServiceTestDb();
    const customDb = await createServiceTestDb();

    await customDb.insert(siteSetting).values({
      key: "home_notice_markdown",
      value: "自定义首页公告",
    });

    await expect(exportAdminSystem(defaultDb)).resolves.toHaveProperty(
      "seed.settings",
      {}
    );
    await expect(exportAdminSystem(customDb)).resolves.toHaveProperty(
      "seed.settings",
      {
        homeNoticeMarkdown: "自定义首页公告",
      }
    );
  });

  it("changes the export hash when exported seed data changes", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      id: "changed-user",
      realName: "Before",
    });
    const beforeChange = await exportAdminSystem(db);
    await db
      .update(userProfile)
      .set({ realName: "After" })
      .where(eq(userProfile.userId, "changed-user"));

    const afterProfileChange = await exportAdminSystem(db);
    await createProblemSetSeed(db, {
      id: "changed-set",
      problems: [{ pid: "P1001" }],
      title: "新增题单",
    });
    const afterProblemSetChange = await exportAdminSystem(db);

    expect(afterProfileChange.hash).not.toBe(beforeChange.hash);
    expect(afterProblemSetChange.hash).not.toBe(afterProfileChange.hash);
  });

  it("does not export authentication secrets", async () => {
    const db = await createServiceTestDb();
    await createUser(db, {
      email: "secret@example.com",
      id: "secret-user-id",
      username: "secret-user",
    });
    const accountId = await createOjAccount(db, {
      handle: "secretHandle",
      platform: "codeforces",
      userId: "secret-user-id",
    });
    await db.insert(codeforcesAccountStats).values({
      accountId,
      acceptedProblemCount: 10,
      lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await db.insert(refreshRequest).values({
      kind: "codeforces.accountStats",
      targetId: accountId,
    });

    const result = await exportAdminSystem(db);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("session");
    expect(serialized).not.toContain("accessToken");
    expect(serialized).not.toContain("refreshToken");
    expect(serialized).not.toContain("verification");
    expect(serialized).not.toContain("secret-user-id");
    expect(serialized).not.toContain(accountId);
    expect(serialized).not.toContain("profileUrl");
    expect(serialized).not.toContain("createdAt");
    expect(serialized).not.toContain("updatedAt");
    expect(serialized).not.toContain("acceptedProblemCount");
    expect(serialized).not.toContain("codeforces.accountStats");
    expect(serialized).not.toContain("refreshRequest");
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
      lastAttemptedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await db.insert(refreshRequest).values({
      kind: "codeforces.accountStats",
      targetId: accountId,
    });

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
});
