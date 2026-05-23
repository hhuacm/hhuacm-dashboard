import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
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
});
