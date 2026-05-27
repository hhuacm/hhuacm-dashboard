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
import { createServiceTestDb } from "../services/test-db";
import { exportSystemSeed } from "./export-seed";

type Database = Awaited<ReturnType<typeof createServiceTestDb>>;

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

describe("system seed export", () => {
  it("ties the content hash to canonical seed data", async () => {
    const db = await createServiceTestDb();

    const firstExport = await exportSystemSeed(db);
    const secondExport = await exportSystemSeed(db);

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

    await createUser(db, {
      grade: "24级",
      id: "stable-user",
      realName: "Before",
    });
    const userExport = await exportSystemSeed(db);
    const repeatedUserExport = await exportSystemSeed(db);

    expect(userExport.hash).toBe(repeatedUserExport.hash);
    expect(userExport.hash).not.toBe(firstExport.hash);

    await db
      .update(userProfile)
      .set({ realName: "After" })
      .where(eq(userProfile.userId, "stable-user"));
    const afterProfileChange = await exportSystemSeed(db);

    await createProblemSetSeed(db, {
      id: "changed-set",
      problems: [{ pid: "P1001" }],
      title: "新增题单",
    });
    const afterProblemSetChange = await exportSystemSeed(db);

    expect(afterProfileChange.hash).not.toBe(userExport.hash);
    expect(afterProblemSetChange.hash).not.toBe(afterProfileChange.hash);
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
      grade: "24级",
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

    const result = await exportSystemSeed(db);

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
        grade: "24级",
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

    const result = await exportSystemSeed(db);

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

    await expect(exportSystemSeed(defaultDb)).resolves.toHaveProperty(
      "seed.settings",
      {}
    );
    await expect(exportSystemSeed(customDb)).resolves.toHaveProperty(
      "seed.settings",
      {
        homeNoticeMarkdown: "自定义首页公告",
      }
    );
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

    const result = await exportSystemSeed(db);
    const serialized = JSON.stringify(result);

    for (const secret of [
      "password",
      "session",
      "accessToken",
      "refreshToken",
      "verification",
      "secret-user-id",
      accountId,
      "profileUrl",
      "createdAt",
      "updatedAt",
      "acceptedProblemCount",
      "codeforces.accountStats",
      "refreshRequest",
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
