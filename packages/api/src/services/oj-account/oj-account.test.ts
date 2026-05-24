import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import type { MemberStatus } from "@hhuacm-dashboard/domain";

import { createServiceTestDb } from "../test-db";
import { addOjAccount } from "./commands";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = ((input) => {
    const url = new URL(input.toString());
    const keyword = url.searchParams.get("keyword") ?? "";

    return Promise.resolve(
      Response.json({
        users: [
          {
            avatar: "",
            background: "",
            badge: null,
            ccfLevel: 0,
            color: "Blue",
            isAdmin: false,
            isBanned: false,
            name: keyword,
            slogan: "",
            uid: 97_238,
            xcpcLevel: 0,
          },
        ],
      })
    );
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

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

  it("enqueues OJ refreshes only for current members", async () => {
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

    expect(refreshRequests).toHaveLength(3);
    expect(refreshRequests.map((request) => request.kind).sort()).toEqual([
      "codeforces.accountStats",
      "luogu.accountStats",
      "user.awardsFromLuogu",
    ]);
  });

  it("treats handle case as significant when checking ownership", async () => {
    const db = await createServiceTestDb();

    await createUser(db, { id: "upper-user" });
    await createUser(db, { id: "lower-user" });

    await addOjAccount(db, {
      handle: "ABC",
      platform: "atcoder",
      userId: "upper-user",
    });
    await addOjAccount(db, {
      handle: "abc",
      platform: "atcoder",
      userId: "lower-user",
    });

    const accounts = await db
      .select({
        handle: userOjAccount.handle,
        userId: userOjAccount.userId,
      })
      .from(userOjAccount);

    expect(accounts).toEqual(
      expect.arrayContaining([
        { handle: "ABC", userId: "upper-user" },
        { handle: "abc", userId: "lower-user" },
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
