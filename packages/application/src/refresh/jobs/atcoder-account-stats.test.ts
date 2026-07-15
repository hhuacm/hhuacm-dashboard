import { describe, expect, it } from "bun:test";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../../services/test-db";
import { atcoderAccountStatsJob } from "./atcoder-account-stats";

describe("AtCoder account stats refresh request", () => {
  const createAccount = async (
    db: Awaited<ReturnType<typeof createServiceTestDb>>,
    input: {
      fetchedAt?: Date | null;
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
      externalId: input.id,
      handle: input.id,
      id: `account-${input.id}`,
      platform: "atcoder",
      userId: input.id,
    });

    if (input.fetchedAt !== undefined) {
      await db.insert(atcoderAccountStats).values({
        accountId: `account-${input.id}`,
        fetchedAt: input.fetchedAt,
        lastAttemptedAt: input.fetchedAt ?? new Date("2026-01-01T00:00:00Z"),
      });
    }
  };

  it("only enqueues due AtCoder accounts for current members", async () => {
    const db = await createServiceTestDb();
    const now = new Date("2026-01-01T00:10:00.000Z");

    await createAccount(db, {
      id: "selection-user",
      memberStatus: "selection",
    });
    await createAccount(db, { id: "active-user", memberStatus: "active" });
    await createAccount(db, { id: "retired-user", memberStatus: "retired" });
    await createAccount(db, { id: "frozen-user", memberStatus: "frozen" });
    await createAccount(db, { id: "missing-profile-user" });
    await createAccount(db, {
      fetchedAt: new Date("2026-01-01T00:09:00.000Z"),
      id: "fresh-user",
      memberStatus: "active",
    });
    await createAccount(db, {
      fetchedAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "expired-user",
      memberStatus: "active",
    });

    const enqueuedCount = await atcoderAccountStatsJob.enqueueDueTargets?.(
      db,
      now
    );
    const requests = await db.select().from(refreshRequest);
    const targetIds = requests.map((request) => request.targetId);

    expect(enqueuedCount).toBe(4);
    expect(targetIds).toContain("account-selection-user");
    expect(targetIds).toContain("account-active-user");
    expect(targetIds).toContain("account-missing-profile-user");
    expect(targetIds).toContain("account-expired-user");
    expect(targetIds).not.toContain("account-retired-user");
    expect(targetIds).not.toContain("account-frozen-user");
    expect(targetIds).not.toContain("account-fresh-user");
  });
});
