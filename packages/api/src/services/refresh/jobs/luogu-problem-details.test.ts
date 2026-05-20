import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";

import type { LuoguProblemListData } from "../../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../../test-db";
import {
  handleLuoguProblemDetailsJob,
  luoguProblemDetailsRefreshJobDefinition,
} from "./luogu-problem-details";

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

describe("Luogu problem details refresh job", () => {
  it("finishes without requeue when the PID is no longer referenced", async () => {
    const db = await createServiceTestDb();

    await expect(
      luoguProblemDetailsRefreshJobDefinition.handle(db, {
        createdAt: new Date(),
        id: "job-1",
        kind: "luogu.problemDetails",
        status: "running",
        targetId: "P1563",
        targetType: "luoguProblem",
      })
    ).resolves.toBeUndefined();
  });

  it("requeues when Luogu lookup fails", async () => {
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
          id: "job-1",
          kind: "luogu.problemDetails",
          status: "running",
          targetId: "P1563",
          targetType: "luoguProblem",
        },
        () => Promise.reject(new Error("network failed"))
      )
    ).resolves.toEqual({ requeue: true });
  });

  it("updates referenced problems without requeue", async () => {
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
          id: "job-1",
          kind: "luogu.problemDetails",
          status: "running",
          targetId: "P1563",
          targetType: "luoguProblem",
        },
        async () =>
          createProblemList([
            { difficulty: 2, name: "玩具谜题", pid: "P1563", type: "P" },
          ])
      )
    ).resolves.toBeUndefined();
  });
});
