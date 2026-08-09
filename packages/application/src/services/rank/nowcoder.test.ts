import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { listNowcoderRankRows } from "./nowcoder";

describe("listNowcoderRankRows", () => {
  const createRankUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      acceptedProblemCount?: null | number;
      id: string;
      memberStatus: MemberStatus;
      rating?: null | number;
    }
  ) => {
    await db.insert(user).values({
      email: `${input.id}@example.com`,
      id: input.id,
      memberStatus: input.memberStatus,
      name: input.id,
      username: input.id,
    });

    await db.insert(userOjAccount).values({
      externalId: input.id,
      handle: input.id,
      id: `account-${input.id}`,
      platform: "nowcoder",
      userId: input.id,
    });

    if (input.acceptedProblemCount !== undefined) {
      await db.insert(nowcoderAccountStats).values({
        acceptedProblemCount: input.acceptedProblemCount,
        accountId: `account-${input.id}`,
        fetchedAt: new Date(),
        lastError: null,
        rating: input.rating ?? null,
      });
    }
  };

  it("includes current members and sorts by Nowcoder accepted count", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      acceptedProblemCount: 90,
      id: "selection-user",
      memberStatus: "selection",
      rating: 1700,
    });
    await createRankUser(db, {
      acceptedProblemCount: 120,
      id: "active-user",
      memberStatus: "active",
      rating: 1600,
    });
    await createRankUser(db, {
      acceptedProblemCount: 120,
      id: "tie-user",
      memberStatus: "active",
      rating: 1800,
    });
    await createRankUser(db, {
      acceptedProblemCount: 300,
      id: "retired-user",
      memberStatus: "retired",
      rating: 3000,
    });
    await createRankUser(db, {
      acceptedProblemCount: 300,
      id: "frozen-user",
      memberStatus: "frozen",
      rating: 3000,
    });
    const rows = await listNowcoderRankRows(db);

    expect(rows.map((row) => row.username)).toEqual([
      "tie-user",
      "active-user",
      "selection-user",
    ]);
  });
});
