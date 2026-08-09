import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { listCodeforcesRankRows } from "./codeforces";

describe("listCodeforcesRankRows", () => {
  const createRankUser = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      id: string;
      memberStatus: MemberStatus;
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
      platform: "codeforces",
      userId: input.id,
    });
  };

  it("includes only current members", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      id: "selection-user",
      memberStatus: "selection",
    });
    await createRankUser(db, { id: "active-user", memberStatus: "active" });
    await createRankUser(db, { id: "retired-user", memberStatus: "retired" });
    await createRankUser(db, { id: "frozen-user", memberStatus: "frozen" });

    const rows = await listCodeforcesRankRows(db);
    const usernames = rows.map((row) => row.username);

    expect(usernames).toContain("selection-user");
    expect(usernames).toContain("active-user");
    expect(usernames).not.toContain("retired-user");
    expect(usernames).not.toContain("frozen-user");
  });
});
