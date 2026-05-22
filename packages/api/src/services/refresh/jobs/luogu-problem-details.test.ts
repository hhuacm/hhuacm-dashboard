import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";

import type { LuoguProblemPageData } from "../../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../../test-db";
import {
  handleLuoguProblemDetailsJob,
  luoguProblemDetailsRefreshJobDefinition,
} from "./luogu-problem-details";

const createProblemPage = (
  problem: LuoguProblemPageData["problem"]
): LuoguProblemPageData => ({
  problem,
});

describe("Luogu problem details refresh job", () => {
  it("finishes when the PID is no longer referenced", async () => {
    const db = await createServiceTestDb();

    await expect(
      luoguProblemDetailsRefreshJobDefinition.handle(db, {
        createdAt: new Date(),
        kind: "luogu.problemDetails",
        status: "running",
        targetId: "P1563",
      })
    ).resolves.toBeUndefined();
  });

  it("throws when Luogu lookup fails", async () => {
    const db = await createServiceTestDb();
    await db.insert(problemSet).values({
      id: "set-a",
      title: "题单",
    });
    await db.insert(problemSetProblem).values({
      id: "problem-a",
      pid: "P1563",
      problemSetId: "set-a",
      sortOrder: 0,
      title: "P1563",
    });

    await expect(
      handleLuoguProblemDetailsJob(
        db,
        {
          createdAt: new Date(),
          kind: "luogu.problemDetails",
          status: "running",
          targetId: "P1563",
        },
        () => Promise.reject(new Error("network failed"))
      )
    ).rejects.toThrow("network failed");
  });

  it("updates referenced problems", async () => {
    const db = await createServiceTestDb();
    await db.insert(problemSet).values({
      id: "set-a",
      title: "题单",
    });
    await db.insert(problemSetProblem).values({
      id: "problem-a",
      pid: "P1563",
      problemSetId: "set-a",
      sortOrder: 0,
      title: "P1563",
    });

    await expect(
      handleLuoguProblemDetailsJob(
        db,
        {
          createdAt: new Date(),
          kind: "luogu.problemDetails",
          status: "running",
          targetId: "P1563",
        },
        async () =>
          createProblemPage({
            difficulty: 2,
            name: "玩具谜题",
            pid: "P1563",
            type: "P",
          })
      )
    ).resolves.toBeUndefined();
  });
});
