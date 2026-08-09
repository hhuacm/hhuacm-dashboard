import { describe, expect, it } from "bun:test";
import {
  problemSet,
  problemSetProblem,
} from "@hhuacm-dashboard/db/schema/problem-set";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";

import { createServiceTestDb } from "../../services/test-db";
import {
  enqueueMissingLuoguProblemDetailsRequests,
  handleLuoguProblemDetailsRequest,
} from "./luogu-problem-details";

describe("Luogu problem details refresh request", () => {
  it("finishes when the PID is no longer referenced", async () => {
    const db = await createServiceTestDb();

    await expect(
      handleLuoguProblemDetailsRequest(db, "P1563")
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

    await enqueueMissingLuoguProblemDetailsRequests(db);

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
