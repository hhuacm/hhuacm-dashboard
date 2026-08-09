import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { userAwardSync } from "@hhuacm-dashboard/db/schema/user-award";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../../services/test-db";
import { enqueueDueUserAwardsFromLuoguRequests } from "./user-awards-from-luogu";

describe("user awards from Luogu refresh request", () => {
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
      memberStatus: input.memberStatus,
      name: input.id,
      username: input.id,
    });

    await db.insert(userOjAccount).values({
      externalId: input.id,
      handle: input.id,
      id: `account-${input.id}`,
      platform: "luogu",
      userId: input.id,
    });
  };

  it("only enqueues due Luogu award refreshes for current members", async () => {
    const db = await createServiceTestDb();
    const dueFetchedAt = new Date("2026-01-01T00:00:00.000Z");
    const freshFetchedAt = new Date();

    await createAccount(db, {
      id: "selection-user",
      memberStatus: "selection",
    });
    await createAccount(db, { id: "active-user", memberStatus: "active" });
    await createAccount(db, { id: "fresh-user", memberStatus: "active" });
    await createAccount(db, { id: "retired-user", memberStatus: "retired" });
    await createAccount(db, { id: "frozen-user", memberStatus: "frozen" });
    await db.insert(userAwardSync).values([
      {
        fetchedAt: freshFetchedAt,
        source: "luogu",
        userId: "fresh-user",
      },
      {
        fetchedAt: dueFetchedAt,
        source: "luogu",
        userId: "selection-user",
      },
    ]);

    await enqueueDueUserAwardsFromLuoguRequests(db, new Date());
    const requests = await db.select().from(refreshRequest);
    const targetIds = requests.map((request) => request.targetId);

    expect(targetIds).toContain("account-selection-user");
    expect(targetIds).toContain("account-active-user");
    expect(targetIds).not.toContain("account-fresh-user");
    expect(targetIds).not.toContain("account-retired-user");
    expect(targetIds).not.toContain("account-frozen-user");
  });
});
