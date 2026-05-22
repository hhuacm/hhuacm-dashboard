import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { getCodeforcesRankStatus, listCodeforcesRankRows } from "./codeforces";

describe("getCodeforcesRankStatus", () => {
  it("prioritizes active refresh jobs", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: new Date(),
        hasActiveRefreshJob: true,
        isFresh: false,
        lastError: "failed",
        statsHandle: "tourist",
      })
    ).toBe("refreshing");
  });

  it("marks missing stats as empty", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: new Date(),
        hasActiveRefreshJob: false,
        isFresh: true,
        lastError: null,
        statsHandle: null,
      })
    ).toBe("empty");
  });

  it("marks failed stats before freshness", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: new Date(),
        hasActiveRefreshJob: false,
        isFresh: true,
        lastError: "Codeforces unavailable",
        statsHandle: "tourist",
      })
    ).toBe("failed");
  });

  it("marks stale stats when refresh policy reports stale", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: new Date(),
        hasActiveRefreshJob: false,
        isFresh: false,
        lastError: null,
        statsHandle: "tourist",
      })
    ).toBe("stale");
  });

  it("marks fresh stats as ready when refresh policy reports fresh", () => {
    expect(
      getCodeforcesRankStatus({
        fetchedAt: new Date(),
        hasActiveRefreshJob: false,
        isFresh: true,
        lastError: null,
        statsHandle: "tourist",
      })
    ).toBe("ready");
  });
});

describe("listCodeforcesRankRows", () => {
  const createRankUser = async (
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
      normalizedHandle: input.id,
      platform: "codeforces",
      profileUrl: `https://codeforces.com/profile/${input.id}`,
      userId: input.id,
    });
  };

  it("includes only public activity member statuses", async () => {
    const db = await createServiceTestDb();

    await createRankUser(db, {
      id: "selection-user",
      memberStatus: "selection",
    });
    await createRankUser(db, { id: "active-user", memberStatus: "active" });
    await createRankUser(db, { id: "retired-user", memberStatus: "retired" });
    await createRankUser(db, { id: "frozen-user", memberStatus: "frozen" });
    await createRankUser(db, { id: "missing-profile-user" });

    const rows = await listCodeforcesRankRows(db);
    const usernames = rows.map((row) => row.username);

    expect(usernames).toContain("selection-user");
    expect(usernames).toContain("active-user");
    expect(usernames).toContain("missing-profile-user");
    expect(usernames).not.toContain("retired-user");
    expect(usernames).not.toContain("frozen-user");
  });
});
