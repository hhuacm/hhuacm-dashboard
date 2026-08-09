import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { eq } from "drizzle-orm";

import type { LuoguProblemPageData } from "../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../test-db";
import { enrichProblemSetProblemsByPid } from "./problem-details";

const createProblemPage = (
  problem: LuoguProblemPageData["problem"]
): LuoguProblemPageData => ({
  problem,
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
    pid: input.pid,
    problemSetId: input.id,
    sortOrder: 0,
    title: null,
  });
};

describe("Luogu problem details", () => {
  it("updates all problem set problems with the same PID", async () => {
    const db = await createServiceTestDb();
    await createProblemSetWithPid(db, { id: "set-a", pid: "P1563" });
    await createProblemSetWithPid(db, { id: "set-b", pid: "P1563" });

    await enrichProblemSetProblemsByPid(db, "P1563", async () =>
      createProblemPage({
        difficulty: 2,
        name: "玩具谜题",
        pid: "P1563",
        type: "P",
      })
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
});
