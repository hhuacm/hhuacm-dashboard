import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";

import { createServiceTestDb } from "../test-db";
import { addOjAccount } from "./commands";

describe("addOjAccount", () => {
  const createUser = async (
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
  };

  it("enqueues Luogu URL refreshes and current-member stats refreshes", async () => {
    const db = await createServiceTestDb();

    await createUser(db, { id: "active-user", memberStatus: "active" });
    await createUser(db, { id: "active-luogu-user", memberStatus: "active" });
    await createUser(db, { id: "retired-user", memberStatus: "retired" });
    await createUser(db, {
      id: "retired-luogu-user",
      memberStatus: "retired",
    });

    await addOjAccount(db, {
      handle: "activeHandle",
      platform: "codeforces",
      userId: "active-user",
    });
    await addOjAccount(db, {
      handle: "retiredHandle",
      platform: "codeforces",
      userId: "retired-user",
    });
    await addOjAccount(db, {
      handle: "activeLuogu",
      platform: "luogu",
      userId: "active-luogu-user",
    });
    await addOjAccount(db, {
      handle: "retiredLuogu",
      platform: "luogu",
      userId: "retired-luogu-user",
    });

    const refreshRequests = await db.select().from(refreshRequest);
    const luoguAccounts = await db
      .select({
        handle: userOjAccount.handle,
        profileUrl: userOjAccount.profileUrl,
      })
      .from(userOjAccount)
      .where(eq(userOjAccount.platform, "luogu"));

    expect(refreshRequests).toHaveLength(5);
    expect(refreshRequests.map((request) => request.kind).sort()).toEqual([
      "codeforces.accountStats",
      "luogu.accountStats",
      "luogu.profileUrl",
      "luogu.profileUrl",
      "user.awardsFromLuogu",
    ]);
    expect(luoguAccounts).toEqual(
      expect.arrayContaining([
        { handle: "activeLuogu", profileUrl: "" },
        { handle: "retiredLuogu", profileUrl: "" },
      ])
    );
  });

  it("rejects the exact same handle on the same platform", async () => {
    const db = await createServiceTestDb();

    await createUser(db, { id: "first-user" });
    await createUser(db, { id: "second-user" });

    await addOjAccount(db, {
      handle: "same-handle",
      platform: "atcoder",
      userId: "first-user",
    });

    await expect(
      addOjAccount(db, {
        handle: "same-handle",
        platform: "atcoder",
        userId: "second-user",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });
});
