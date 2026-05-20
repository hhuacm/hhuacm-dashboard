import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { eq } from "drizzle-orm";

import type { LuoguProblemListData } from "../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../test-db";
import {
  enrichProblemSetProblemsByPid,
  findLuoguProblemDetails,
} from "./problem-details";

const createProblemList = (
  problems: LuoguProblemListData["problems"]["result"]
): LuoguProblemListData => ({
  page: 1,
  problems: {
    count: problems.length,
    perPage: 50,
    result: problems,
  },
});

const createProblemSetWithPid = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  input: { id: string; pid: string }
) => {
  await db.insert(problemSet).values({
    id: input.id,
    title: input.id,
  });
  await db.insert(problemSetProblem).values({
    id: `problem-${input.id}`,
    pid: input.pid,
    problemSetId: input.id,
    sortOrder: 0,
    title: input.pid,
  });
};

describe("Luogu problem details", () => {
  it("selects the exact PID from problem search results", async () => {
    await expect(
      findLuoguProblemDetails("P1563", async () =>
        createProblemList([
          { difficulty: 1, name: "Other", pid: "P9999", type: "P" },
          { difficulty: 2, name: "玩具谜题", pid: "P1563", type: "P" },
        ])
      )
    ).resolves.toEqual({
      difficulty: 2,
      pid: "P1563",
      title: "玩具谜题",
    });
  });

  it("throws when the exact PID is missing", async () => {
    await expect(
      findLuoguProblemDetails("P1563", async () =>
        createProblemList([
          { difficulty: 1, name: "Other", pid: "P9999", type: "P" },
        ])
      )
    ).rejects.toThrow("Luogu problem does not exist: P1563");
  });

  it("updates all problem set problems with the same PID", async () => {
    const db = await createServiceTestDb();
    await createProblemSetWithPid(db, { id: "set-a", pid: "P1563" });
    await createProblemSetWithPid(db, { id: "set-b", pid: "P1563" });

    await enrichProblemSetProblemsByPid(db, "P1563", async () =>
      createProblemList([
        { difficulty: 2, name: "玩具谜题", pid: "P1563", type: "P" },
      ])
    );
    const problems = await db
      .select()
      .from(problemSetProblem)
      .where(eq(problemSetProblem.pid, "P1563"));

    expect(problems.map((problem) => problem.title)).toEqual([
      "玩具谜题",
      "玩具谜题",
    ]);
    expect(problems.map((problem) => problem.difficulty)).toEqual([2, 2]);
  });

  it("does not call Luogu when no problem set references the PID", async () => {
    const db = await createServiceTestDb();
    let didCallLuogu = false;

    await expect(
      enrichProblemSetProblemsByPid(db, "P1563", () => {
        didCallLuogu = true;

        return Promise.resolve(createProblemList([]));
      })
    ).resolves.toBe("unused");
    expect(didCallLuogu).toBe(false);
  });
});
