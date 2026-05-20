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
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { eq } from "drizzle-orm";

import {
  createProblemSet,
  deleteProblemSet,
  getProblemSet,
  listProblemSets,
  updateProblemSet,
} from "./problem-set";
import { createServiceTestDb } from "./test-db";

const createLuoguUser = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  input: { fetchedAt?: Date; id: string }
) => {
  await db.insert(user).values({
    email: `${input.id}@example.com`,
    id: input.id,
    name: input.id,
    username: input.id,
  });
  await db.insert(userOjAccount).values({
    handle: input.id,
    id: `account-${input.id}`,
    normalizedHandle: input.id,
    platform: "luogu",
    profileUrl: "https://www.luogu.com.cn/user/97238",
    userId: input.id,
  });

  if (input.fetchedAt) {
    await db.insert(luoguAccountStats).values({
      accountId: `account-${input.id}`,
      fetchedAt: input.fetchedAt,
      lastAttemptedAt: input.fetchedAt,
      lastError: null,
      uid: 97_238,
    });
  }
};

describe("problem sets", () => {
  it("creates problems in order and enqueues distinct Luogu problem jobs", async () => {
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
    const jobs = await db
      .select()
      .from(refreshJob)
      .orderBy(refreshJob.targetId);

    expect(created.title).toBe("基础题单");
    expect(problems.map((problem) => problem.pid)).toEqual(["P1563", "P1328"]);
    expect(problems.map((problem) => problem.title)).toEqual([
      "P1563",
      "P1328",
    ]);
    expect(jobs.map((job) => [job.kind, job.targetType, job.targetId])).toEqual(
      [
        ["luogu.problemDetails", "luoguProblem", "P1328"],
        ["luogu.problemDetails", "luoguProblem", "P1563"],
      ]
    );
  });

  it("rejects duplicate PIDs", async () => {
    const db = await createServiceTestDb();

    await expect(
      createProblemSet(db, {
        descriptionMarkdown: "",
        pids: ["P1563", "P1563"],
        title: "重复题单",
      })
    ).rejects.toThrow("Duplicate Luogu PID: P1563");
  });

  it("returns null accepted status without a Luogu account", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563"],
      title: "基础题单",
    });

    const result = await getProblemSet(db, {
      currentUserId: null,
      id: created.id,
    });

    expect(result.problems).toEqual([
      {
        accepted: null,
        difficulty: null,
        pid: "P1563",
        title: "P1563",
      },
    ]);
  });

  it("returns accepted status from cached Luogu accepted problems", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    await createLuoguUser(db, { fetchedAt, id: "viewer" });
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563", "P1328"],
      title: "基础题单",
    });
    await db.insert(luoguAcceptedProblem).values({
      accountId: "account-viewer",
      difficulty: 2,
      firstSeenAt: fetchedAt,
      lastSeenAt: fetchedAt,
      name: "玩具谜题",
      pid: "P1563",
      type: "P",
    });

    const result = await getProblemSet(db, {
      currentUserId: "viewer",
      id: created.id,
    });

    expect(result.problems.map((problem) => problem.accepted)).toEqual([
      true,
      false,
    ]);
  });

  it("lists problem sets with cached completion counts", async () => {
    const db = await createServiceTestDb();
    const fetchedAt = new Date("2026-01-01T00:00:00.000Z");
    await createLuoguUser(db, { fetchedAt, id: "viewer" });
    await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563", "P1328"],
      title: "基础题单",
    });
    await db.insert(luoguAcceptedProblem).values({
      accountId: "account-viewer",
      difficulty: 2,
      firstSeenAt: fetchedAt,
      lastSeenAt: fetchedAt,
      name: "玩具谜题",
      pid: "P1563",
      type: "P",
    });

    const [item] = await listProblemSets(db, {
      currentUserId: "viewer",
    });

    expect(item?.problemCount).toBe(2);
    expect(item?.completedProblemCount).toBe(1);
  });

  it("enqueues Luogu account refresh when accepted cache is missing", async () => {
    const db = await createServiceTestDb();
    await createLuoguUser(db, { id: "viewer" });
    const created = await createProblemSet(db, {
      descriptionMarkdown: "",
      pids: ["P1563"],
      title: "基础题单",
    });

    const result = await getProblemSet(db, {
      currentUserId: "viewer",
      id: created.id,
    });
    const jobs = await db
      .select()
      .from(refreshJob)
      .where(eq(refreshJob.kind, "luogu.accountStats"));

    expect(result.problems[0]?.accepted).toBeNull();
    expect(jobs.map((job) => job.targetId)).toEqual(["account-viewer"]);
  });

  it("updates metadata without replacing problems", async () => {
    const db = await createServiceTestDb();
    const created = await createProblemSet(db, {
      descriptionMarkdown: "旧说明",
      pids: ["P1563"],
      title: "旧标题",
    });
    await db.delete(refreshJob);

    const updated = await updateProblemSet(db, {
      descriptionMarkdown: "新说明",
      id: created.id,
      title: "新标题",
    });
    const problems = await db.select().from(problemSetProblem);
    const jobs = await db.select().from(refreshJob);

    expect(updated.title).toBe("新标题");
    expect(updated.descriptionMarkdown).toBe("新说明");
    expect(problems.map((problem) => problem.pid)).toEqual(["P1563"]);
    expect(jobs).toHaveLength(0);
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
    await db.delete(refreshJob);

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
