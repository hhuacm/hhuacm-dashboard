import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { eq } from "drizzle-orm";

import type { LuoguProblemPageData } from "../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../test-db";
import {
  enrichProblemSetProblemsByPid,
  findLuoguProblemDetails,
} from "./problem-details";

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
    title: input.pid,
  });
};

describe("Luogu problem details", () => {
  it("loads problem details by PID", async () => {
    await expect(
      findLuoguProblemDetails("P1563", async () =>
        createProblemPage({
          difficulty: 2,
          name: "玩具谜题",
          pid: "P1563",
          type: "P",
        })
      )
    ).resolves.toEqual({
      difficulty: 2,
      pid: "P1563",
      title: "玩具谜题",
    });
  });

  it("loads multi-letter problem details by PID", async () => {
    await expect(
      findLuoguProblemDetails("CF1027G", async () =>
        createProblemPage({
          difficulty: 7,
          name: "X-mouse in the Campus",
          pid: "CF1027G",
          type: "CF",
        })
      )
    ).resolves.toEqual({
      difficulty: 7,
      pid: "CF1027G",
      title: "X-mouse in the Campus",
    });
  });

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

  it("does not call Luogu when no problem set references the PID", async () => {
    const db = await createServiceTestDb();
    let didCallLuogu = false;

    await expect(
      enrichProblemSetProblemsByPid(db, "P1563", () => {
        didCallLuogu = true;

        return Promise.resolve(
          createProblemPage({
            difficulty: 2,
            name: "玩具谜题",
            pid: "P1563",
            type: "P",
          })
        );
      })
    ).resolves.toBe("unused");
    expect(didCallLuogu).toBe(false);
  });
});
