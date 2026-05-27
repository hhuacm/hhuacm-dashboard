import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";

import type { LuoguProblemPageData } from "../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../../services/test-db";
import {
  handleLuoguProblemDetailsRequest,
  luoguProblemDetailsJob,
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
      luoguProblemDetailsJob.handle(db, {
        createdAt: new Date(),
        kind: luoguProblemDetailsJob.kind,
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
      title: null,
    });

    await expect(
      handleLuoguProblemDetailsRequest(
        db,
        {
          createdAt: new Date(),
          kind: luoguProblemDetailsJob.kind,
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
      title: null,
    });

    await expect(
      handleLuoguProblemDetailsRequest(
        db,
        {
          createdAt: new Date(),
          kind: luoguProblemDetailsJob.kind,
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

  it("enqueues distinct PIDs with missing problem details", async () => {
    const db = await createServiceTestDb();
    await db.insert(problemSet).values({
      id: "set-a",
      title: "题单",
    });
    await db.insert(problemSetProblem).values([
      {
        difficulty: null,
        pid: "P1563",
        problemSetId: "set-a",
        sortOrder: 0,
        title: null,
      },
      {
        difficulty: null,
        pid: "P1328",
        problemSetId: "set-a",
        sortOrder: 1,
        title: "生活大爆炸版石头剪刀布",
      },
      {
        difficulty: 2,
        pid: "P1001",
        problemSetId: "set-a",
        sortOrder: 2,
        title: "A+B Problem",
      },
    ]);

    await expect(
      luoguProblemDetailsJob.enqueueDueTargets?.(db, new Date())
    ).resolves.toBe(2);

    const requests = await db
      .select()
      .from(refreshRequest)
      .orderBy(refreshRequest.targetId);

    expect(requests.map((request) => request.targetId)).toEqual([
      "P1328",
      "P1563",
    ]);
  });
});
