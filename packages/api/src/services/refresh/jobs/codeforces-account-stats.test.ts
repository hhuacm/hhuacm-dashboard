import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../../test-db";
import { codeforcesAccountStatsRefreshRequestDefinition } from "./codeforces-account-stats";

describe("Codeforces account stats refresh request", () => {
  const createAccount = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      id: string;
      memberStatus?: MemberStatus;
    }
  ) => {
    await db.insert(user).values({
      email: `${input.id}@example.com`,
      id: input.id,
      name: input.id,
      username: input.id,
    });

    if (input.memberStatus) {
      await db.insert(userProfile).values({
        memberStatus: input.memberStatus,
        userId: input.id,
      });
    }

    await db.insert(userOjAccount).values({
      handle: input.id,
      id: `account-${input.id}`,
      platform: "codeforces",
      profileUrl: `https://codeforces.com/profile/${input.id}`,
      userId: input.id,
    });
  };

  it("only enqueues due Codeforces accounts for current members", async () => {
    const db = await createServiceTestDb();

    await createAccount(db, {
      id: "selection-user",
      memberStatus: "selection",
    });
    await createAccount(db, { id: "active-user", memberStatus: "active" });
    await createAccount(db, { id: "retired-user", memberStatus: "retired" });
    await createAccount(db, { id: "frozen-user", memberStatus: "frozen" });
    await createAccount(db, { id: "missing-profile-user" });

    const enqueuedCount =
      await codeforcesAccountStatsRefreshRequestDefinition.enqueueDueTargets(
        db,
        new Date()
      );
    const requests = await db.select().from(refreshRequest);
    const targetIds = requests.map((request) => request.targetId);

    expect(enqueuedCount).toBe(3);
    expect(targetIds).toContain("account-selection-user");
    expect(targetIds).toContain("account-active-user");
    expect(targetIds).toContain("account-missing-profile-user");
    expect(targetIds).not.toContain("account-retired-user");
    expect(targetIds).not.toContain("account-frozen-user");
  });
});
