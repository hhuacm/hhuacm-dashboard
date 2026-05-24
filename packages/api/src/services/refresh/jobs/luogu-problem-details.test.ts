import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";

import type { LuoguProblemPageData } from "../../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../../test-db";
import {
  handleLuoguProblemDetailsRequest,
  luoguProblemDetailsRefreshRequestDefinition,
} from "./luogu-problem-details";

const createProblemPage = (
  problem: LuoguProblemPageData["problem"]
): LuoguProblemPageData => ({
  problem,
});

describe("Luogu problem details refresh request", () => {
  it("finishes when the PID is no longer referenced", async () => {
    const db = await createServiceTestDb();

    await expect(
      luoguProblemDetailsRefreshRequestDefinition.handle(db, {
        createdAt: new Date(),
        kind: "luogu.problemDetails",
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
      pid: "P1563",
      problemSetId: "set-a",
      sortOrder: 0,
      title: "P1563",
    });

    await expect(
      handleLuoguProblemDetailsRequest(
        db,
        {
          createdAt: new Date(),
          kind: "luogu.problemDetails",
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
      pid: "P1563",
      problemSetId: "set-a",
      sortOrder: 0,
      title: "P1563",
    });

    await expect(
      handleLuoguProblemDetailsRequest(
        db,
        {
          createdAt: new Date(),
          kind: "luogu.problemDetails",
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
