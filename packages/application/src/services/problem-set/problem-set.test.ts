import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";

import { createServiceTestDb } from "../test-db";
import {
  createProblemSet,
  deleteProblemSet,
  updateProblemSet,
} from "./mutation";
import {
  getProblemSet,
  listProblemSetCompletions,
  listProblemSets,
} from "./query";

const createLuoguUser = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  input: {
    fetchedAt?: Date;
    grade?: null | string;
    id: string;
    memberStatus?: MemberStatus;
    realName?: null | string;
    username?: string;
  }
) => {
  await db.insert(user).values({
    email: `${input.id}@example.com`,
    id: input.id,
    name: input.id,
    username: input.username ?? input.id,
  });

  if (
    input.grade !== undefined ||
    input.memberStatus ||
    input.realName !== undefined
  ) {
    await db.insert(userProfile).values({
      grade: input.grade ?? null,
      memberStatus: input.memberStatus ?? "selection",
      realName: input.realName,
      userId: input.id,
    });
  }

  await db.insert(userOjAccount).values({
    externalId: input.id,
    handle: input.id,
    id: `account-${input.id}`,
    platform: "luogu",
    userId: input.id,
  });

  if (input.fetchedAt) {
    await db.insert(luoguAccountStats).values({
      accountId: `account-${input.id}`,
      fetchedAt: input.fetchedAt,
      lastAttemptedAt: input.fetchedAt,
      lastError: null,
    });
  }
};

const createAcceptedProblem = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  input: {
    accountId: string;
    pid: string;
  }
) => {
  await db.insert(luoguAcceptedProblem).values({
    accountId: input.accountId,
    difficulty: 2,
    name: input.pid,
    pid: input.pid,
    type: "P",
  });
};

describe("problem sets", () => {
  it("creates problems in order and enqueues distinct Luogu problem requests", async () => {
    const db = await createServiceTestDb();

    const created = await createProblemSet(db, {
      descriptionMarkdown: "训练说明",
      pids: ["P1563", "P1328"],
      title: "基础题单",
    });
    const problems = await db
      .select()
      .from(problemSetProblem)
      .orderBy(problemSetProblem.sortOrder);
    const requests = await db
      .select()
      .from(refreshRequest)
      .orderBy(refreshRequest.targetId);

    expect(created.title).toBe("基础题单");
    expect(problems.map((problem) => problem.pid)).toEqual(["P1563", "P1328"]);
    expect(problems.map((problem) => problem.title)).toEqual([null, null]);
    expect(problems.map((problem) => problem.difficulty)).toEqual([null, null]);
    expect(requests.map((request) => [request.kind, request.targetId])).toEqual(
      [
        ["luogu.problemDetails", "P1328"],
        ["luogu.problemDetails", "P1563"],
      ]
    );
  });

  it("validates PIDs while accepting mixed Luogu-style identifiers", async () => {
    const db = await createServiceTestDb();

    await expect(
      createProblemSet(db, {
        descriptionMarkdown: "",
        pids: ["P1563", "P1563"],
        title: "重复题单",
      })
    ).rejects.toThrow("Duplicate Luogu PID: P1563");

    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1676", "CF1027G"],
      title: "混合题号题单",
    });

    expect(created.problems.map((problem) => problem.pid)).toEqual([
      "P1676",
      "CF1027G",
    ]);
  });

  it("resolves problem accepted state from the viewer's Luogu account cache", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563", "P1328"],
      title: "基础题单",
    });

    const anonymousResult = await getProblemSet(db, {
      currentUserId: null,
      id: created.id,
    });

    expect(anonymousResult.problems.map((problem) => problem.accepted)).toEqual(
      [null, null]
    );

    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    await createLuoguUser(db, { fetchedAt, id: "viewer" });
    await createAcceptedProblem(db, {
      accountId: "account-viewer",
      pid: "P1563",
    });

    const result = await getProblemSet(db, {
      currentUserId: "viewer",
      id: created.id,
    });

    expect(result.problems.map((problem) => problem.accepted)).toEqual([
      true,
      false,
    ]);

    await createLuoguUser(db, { id: "stale-viewer" });

    const staleResult = await getProblemSet(db, {
      currentUserId: "stale-viewer",
      id: created.id,
    });
    const requests = await db
      .select()
      .from(refreshRequest)
      .where(eq(refreshRequest.kind, "luogu.accountStats"));

    expect(staleResult.problems.map((problem) => problem.accepted)).toEqual([
      null,
      null,
    ]);
    expect(requests.map((request) => request.targetId)).toContain(
      "account-stale-viewer"
    );

    const [item] = await listProblemSets(db, {
      currentUserId: "viewer",
    });

    expect(item?.problemCount).toBe(2);
    expect(item?.completedProblemCount).toBe(1);
  });

  it("enqueues missing problem detail refreshes when reading a problem set", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563", "P1328"],
      title: "基础题单",
    });
    await db
      .update(problemSetProblem)
      .set({
        difficulty: 2,
        title: "玩具谜题",
      })
      .where(eq(problemSetProblem.pid, "P1563"));
    await db.delete(refreshRequest);

    await getProblemSet(db, {
      currentUserId: null,
      id: created.id,
    });
    const requests = await db.select().from(refreshRequest);

    expect(requests.map((request) => [request.kind, request.targetId])).toEqual(
      [["luogu.problemDetails", "P1328"]]
    );
  });

  it("updates metadata without replacing problems", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "旧说明",
      pids: ["P1563"],
      title: "旧标题",
    });
    await db.delete(refreshRequest);

    const updated = await updateProblemSet(db, {
      descriptionMarkdown: "新说明",
      id: created.id,
      title: "新标题",
    });
    const problems = await db.select().from(problemSetProblem);
    const requests = await db.select().from(refreshRequest);

    expect(updated.title).toBe("新标题");
    expect(updated.descriptionMarkdown).toBe("新说明");
    expect(problems.map((problem) => problem.pid)).toEqual(["P1563"]);
    expect(requests.map((request) => [request.kind, request.targetId])).toEqual(
      [["luogu.problemDetails", "P1563"]]
    );
  });

  it("replaces problems and preserves existing details for reused PIDs", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563", "P1328"],
      title: "基础题单",
    });
    await db
      .update(problemSetProblem)
      .set({ difficulty: 2, title: "玩具谜题" })
      .where(eq(problemSetProblem.pid, "P1563"));
    await db.delete(refreshRequest);

    await updateProblemSet(db, {
      id: created.id,
      pids: ["P1328", "P1563", "P2615"],
    });
    const problems = await db
      .select()
      .from(problemSetProblem)
      .orderBy(problemSetProblem.sortOrder);

    expect(problems.map((problem) => problem.pid)).toEqual([
      "P1328",
      "P1563",
      "P2615",
    ]);
    expect(problems.find((problem) => problem.pid === "P1563")?.title).toBe(
      "玩具谜题"
    );
  });

  it("lists completions for eligible users by current problem set PIDs", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563", "P1328"],
      title: "基础题单",
    });
    for (const currentUser of [
      {
        grade: "24级",
        id: "selection-user",
        memberStatus: "selection",
        realName: "张三",
      },
      { grade: "23级", id: "active-user", memberStatus: "active" },
      { id: "missing-profile-user" },
      { id: "retired-user", memberStatus: "retired" },
      { id: "frozen-user", memberStatus: "frozen" },
      { id: "zero-user", memberStatus: "selection" },
    ] as const) {
      await createLuoguUser(db, currentUser);
    }

    for (const acceptedProblem of [
      { accountId: "account-selection-user", pid: "P1563" },
      { accountId: "account-selection-user", pid: "P1328" },
      { accountId: "account-selection-user", pid: "P2615" },
      { accountId: "account-active-user", pid: "P1563" },
      { accountId: "account-missing-profile-user", pid: "P1328" },
      { accountId: "account-retired-user", pid: "P1563" },
      { accountId: "account-frozen-user", pid: "P1563" },
    ]) {
      await createAcceptedProblem(db, acceptedProblem);
    }

    const rows = await listProblemSetCompletions(db, created.id);
    const rowsByUserId = new Map(rows.map((row) => [row.userId, row]));

    expect(rows).toHaveLength(3);
    expect(rowsByUserId.get("selection-user")).toEqual({
      completedProblemCount: 2,
      grade: "24级",
      memberStatus: "selection",
      realName: "张三",
      userId: "selection-user",
      username: "selection-user",
    });
    expect(rowsByUserId.get("active-user")).toEqual({
      completedProblemCount: 1,
      grade: "23级",
      memberStatus: "active",
      realName: null,
      userId: "active-user",
      username: "active-user",
    });
    expect(rowsByUserId.get("missing-profile-user")).toEqual({
      completedProblemCount: 1,
      grade: null,
      memberStatus: "selection",
      realName: null,
      userId: "missing-profile-user",
      username: "missing-profile-user",
    });
    expect(rowsByUserId.has("retired-user")).toBe(false);
    expect(rowsByUserId.has("frozen-user")).toBe(false);
    expect(rowsByUserId.has("zero-user")).toBe(false);
  });

  it("throws NOT_FOUND when listing completions for a missing problem set", async () => {
    const db = await createServiceTestDb();

    await expect(
      listProblemSetCompletions(db, "missing-set")
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("deletes a problem set and its problems", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563"],
      title: "基础题单",
    });

    await deleteProblemSet(db, created.id);
    const problemSets = await db.select().from(problemSet);
    const problems = await db.select().from(problemSetProblem);

    expect(problemSets).toHaveLength(0);
    expect(problems).toHaveLength(0);
  });
});
