import { describe, expect, it } from "bun:test";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { eq } from "drizzle-orm";

import type { LuoguUserSearchResult } from "../../external/online-judge-sources/luogu/api";
import { createServiceTestDb } from "../../services/test-db";
import {
  handleLuoguProfileUrlRequest,
  luoguProfileUrlJob,
} from "./luogu-profile-url";

const createUser = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  id = "luogu-user"
) => {
  await db.insert(user).values({
    email: `${id}@example.com`,
    id,
    name: id,
    username: id,
  });
};

const createLuoguAccount = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>,
  input: {
    handle?: string;
    id?: string;
    profileUrl?: string;
    userId?: string;
  } = {}
) => {
  const account = {
    handle: input.handle ?? "forlight",
    id: input.id ?? "luogu-account",
    profileUrl: input.profileUrl ?? "",
  };

  await db.insert(userOjAccount).values({
    ...account,
    platform: "luogu",
    userId: input.userId ?? "luogu-user",
  });

  return account;
};

const createSearchResult = (
  users: Array<{
    name: string;
    uid: number;
  }>
): LuoguUserSearchResult => ({
  users: users.map((currentUser) => ({
    avatar: "",
    background: "",
    badge: null,
    ccfLevel: 0,
    color: "Blue",
    isAdmin: false,
    isBanned: false,
    name: currentUser.name,
    slogan: "",
    uid: currentUser.uid,
    xcpcLevel: 0,
  })),
});

describe("Luogu profile URL refresh job", () => {
  it("refreshes a Luogu account profile URL from its handle", async () => {
    const db = await createServiceTestDb();
    await createUser(db);
    const account = await createLuoguAccount(db);

    await handleLuoguProfileUrlRequest(
      db,
      {
        createdAt: new Date(),
        kind: luoguProfileUrlJob.kind,
        targetId: account.id,
      },
      async ({ keyword }) =>
        createSearchResult([
          { name: "someone-else", uid: 1 },
          { name: keyword, uid: 97_238 },
        ])
    );
    const [updatedAccount] = await db
      .select({ profileUrl: userOjAccount.profileUrl })
      .from(userOjAccount)
      .where(eq(userOjAccount.id, account.id));

    expect(updatedAccount?.profileUrl).toBe(
      "https://www.luogu.com.cn/user/97238"
    );
  });

  it("enqueues Luogu accounts with missing profile URLs", async () => {
    const db = await createServiceTestDb();
    await createUser(db, "missing-url-user");
    await createUser(db, "present-url-user");
    await createLuoguAccount(db, {
      id: "missing-url",
      userId: "missing-url-user",
    });
    await createLuoguAccount(db, {
      id: "present-url",
      profileUrl: "https://www.luogu.com.cn/user/1",
      userId: "present-url-user",
    });

    const count = await luoguProfileUrlJob.enqueueDueTargets?.(db, new Date());
    const requests = await db.select().from(refreshRequest);

    expect(count).toBe(1);
    expect(requests).toEqual([
      expect.objectContaining({
        kind: "luogu.profileUrl",
        targetId: "missing-url",
      }),
    ]);
  });

  it("rejects missing Luogu accounts", async () => {
    const db = await createServiceTestDb();

    await expect(
      handleLuoguProfileUrlRequest(db, {
        createdAt: new Date(),
        kind: luoguProfileUrlJob.kind,
        targetId: "missing-account",
      })
    ).rejects.toThrow("Luogu account does not exist: missing-account");
  });
});
