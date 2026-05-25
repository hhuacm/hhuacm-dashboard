import { describe, expect, it } from "bun:test";
import { account, user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { verifyPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";
import {
  codeforcesAccountStatsRequestKind,
  luoguAccountStatsRequestKind,
  luoguProfileUrlRequestKind,
  userAwardsFromLuoguRequestKind,
} from "../services/refresh/request-types";
import { createServiceTestDb } from "../services/test-db";
import {
  importUsersFromSystemSeedFile,
  SystemUserImportError,
} from "./import-users";
import {
  createSystemSeedFile,
  type SystemSeed,
  SystemSeedFormatError,
  type SystemSeedUser,
} from "./seed-format";

const createSeedFile = (users: SystemSeedUser[]) =>
  createSystemSeedFile({
    problemSets: [],
    settings: {},
    users,
  });

const createExistingUser = async (
  db: Awaited<ReturnType<typeof createServiceTestDb>>
) => {
  await db.insert(user).values({
    email: "existing@example.com",
    id: "existing-user",
    name: "existing-user",
    username: "existing-user",
  });
};

const listUsers = async (db: Awaited<ReturnType<typeof createServiceTestDb>>) =>
  await db
    .select({
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username,
    })
    .from(user)
    .orderBy(asc(user.username));

describe("system import users", () => {
  it("imports an empty user seed as a no-op", async () => {
    const db = await createServiceTestDb();

    await expect(
      importUsersFromSystemSeedFile(db, createSeedFile([]))
    ).resolves.toEqual({
      adminCount: 0,
      ojAccountCount: 0,
      profileCount: 0,
      refreshRequestCount: 0,
      userCount: 0,
    });
    await expect(listUsers(db)).resolves.toEqual([]);
  });

  it("creates credential users with the default password", async () => {
    const db = await createServiceTestDb();

    await importUsersFromSystemSeedFile(
      db,
      createSeedFile([
        {
          email: "alice@example.com",
          username: "alice",
        },
      ])
    );

    const [createdUser] = await listUsers(db);
    const [credentialAccount] = await db
      .select({
        accountId: account.accountId,
        password: account.password,
        providerId: account.providerId,
        userId: account.userId,
      })
      .from(account)
      .where(eq(account.userId, createdUser?.id ?? ""))
      .limit(1);

    expect(createdUser).toMatchObject({
      email: "alice@example.com",
      emailVerified: true,
      name: "alice",
      role: "user",
      username: "alice",
    });
    expect(credentialAccount).toMatchObject({
      accountId: createdUser?.id,
      providerId: "credential",
      userId: createdUser?.id,
    });
    expect(credentialAccount?.password).toBeString();
    expect(
      await verifyPassword({
        hash: credentialAccount?.password ?? "",
        password: "12345678",
      })
    ).toBe(true);
  });

  it("imports admin role and profile fields", async () => {
    const db = await createServiceTestDb();

    const result = await importUsersFromSystemSeedFile(
      db,
      createSeedFile([
        {
          email: "admin@example.com",
          profile: {
            grade: "2024级",
            major: "计算机科学与技术",
            memberStatus: "active",
            realName: "Admin",
            studentId: "20240001",
          },
          role: "admin",
          username: "admin",
        },
      ])
    );
    const [createdUser] = await listUsers(db);
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, createdUser?.id ?? ""))
      .limit(1);

    expect(result).toMatchObject({
      adminCount: 1,
      profileCount: 1,
      userCount: 1,
    });
    expect(createdUser?.role).toBe("admin");
    expect(profile).toMatchObject({
      grade: "2024级",
      major: "计算机科学与技术",
      memberStatus: "active",
      realName: "Admin",
      studentId: "20240001",
    });
  });

  it("imports OJ accounts offline and requests Luogu URL refreshes", async () => {
    const db = await createServiceTestDb();

    const result = await importUsersFromSystemSeedFile(
      db,
      createSeedFile([
        {
          email: "selection@example.com",
          ojAccounts: [
            {
              handle: "selectionCf",
              platform: "codeforces",
            },
          ],
          username: "selection-user",
        },
        {
          email: "active@example.com",
          ojAccounts: [
            {
              handle: "activeLuogu",
              platform: "luogu",
            },
          ],
          profile: {
            memberStatus: "active",
          },
          username: "active-user",
        },
        {
          email: "retired@example.com",
          ojAccounts: [
            {
              handle: "retiredCf",
              platform: "codeforces",
            },
          ],
          profile: {
            memberStatus: "retired",
          },
          username: "retired-user",
        },
        {
          email: "frozen@example.com",
          ojAccounts: [
            {
              handle: "frozenLuogu",
              platform: "luogu",
            },
          ],
          profile: {
            memberStatus: "frozen",
          },
          username: "frozen-user",
        },
      ])
    );
    const accounts = await db
      .select({
        handle: userOjAccount.handle,
        id: userOjAccount.id,
        platform: userOjAccount.platform,
        profileUrl: userOjAccount.profileUrl,
      })
      .from(userOjAccount)
      .orderBy(asc(userOjAccount.handle));
    const requests = await db
      .select({
        kind: refreshRequest.kind,
        targetId: refreshRequest.targetId,
      })
      .from(refreshRequest)
      .orderBy(asc(refreshRequest.kind), asc(refreshRequest.targetId));
    const accountByHandle = new Map(
      accounts.map((currentAccount) => [currentAccount.handle, currentAccount])
    );

    expect(result).toMatchObject({
      ojAccountCount: 4,
      refreshRequestCount: 5,
    });
    expect(accounts.map((currentAccount) => currentAccount.profileUrl)).toEqual(
      ["", "", "", ""]
    );
    expect(requests).toEqual(
      expect.arrayContaining([
        {
          kind: codeforcesAccountStatsRequestKind,
          targetId: accountByHandle.get("selectionCf")?.id,
        },
        {
          kind: luoguAccountStatsRequestKind,
          targetId: accountByHandle.get("activeLuogu")?.id,
        },
        {
          kind: luoguProfileUrlRequestKind,
          targetId: accountByHandle.get("activeLuogu")?.id,
        },
        {
          kind: luoguProfileUrlRequestKind,
          targetId: accountByHandle.get("frozenLuogu")?.id,
        },
        {
          kind: userAwardsFromLuoguRequestKind,
          targetId: accountByHandle.get("activeLuogu")?.id,
        },
      ])
    );
    expect(
      requests.some(
        (request) => request.targetId === accountByHandle.get("retiredCf")?.id
      )
    ).toBe(false);
    expect(
      requests.some(
        (request) =>
          request.targetId === accountByHandle.get("frozenLuogu")?.id &&
          request.kind !== luoguProfileUrlRequestKind
      )
    ).toBe(false);
  });

  it("rejects importing into a non-empty user domain", async () => {
    const db = await createServiceTestDb();
    await createExistingUser(db);

    await expect(
      importUsersFromSystemSeedFile(
        db,
        createSeedFile([{ email: "next@example.com", username: "next" }])
      )
    ).rejects.toBeInstanceOf(SystemUserImportError);
  });

  it("rejects invalid seed files", async () => {
    const db = await createServiceTestDb();
    const seedFile = createSeedFile([
      {
        email: "alice@example.com",
        username: "alice",
      },
    ]);

    await expect(
      importUsersFromSystemSeedFile(db, { ...seedFile, hash: "invalid" })
    ).rejects.toBeInstanceOf(SystemSeedFormatError);
    await expect(
      importUsersFromSystemSeedFile(db, { ...seedFile, kind: "invalid" })
    ).rejects.toBeInstanceOf(SystemSeedFormatError);
    await expect(
      importUsersFromSystemSeedFile(db, { ...seedFile, version: 2 })
    ).rejects.toBeInstanceOf(SystemSeedFormatError);
  });

  it("rejects duplicate user and OJ account identities", async () => {
    const db = await createServiceTestDb();

    await expect(
      importUsersFromSystemSeedFile(
        db,
        createSeedFile([
          { email: "first@example.com", username: "same" },
          { email: "second@example.com", username: "same" },
        ])
      )
    ).rejects.toThrow("Duplicate username");
    await expect(
      importUsersFromSystemSeedFile(
        db,
        createSeedFile([
          { email: "same@example.com", username: "first" },
          { email: "same@example.com", username: "second" },
        ])
      )
    ).rejects.toThrow("Duplicate email");
    await expect(
      importUsersFromSystemSeedFile(
        db,
        createSeedFile([
          {
            email: "first@example.com",
            ojAccounts: [{ handle: "sameHandle", platform: "luogu" }],
            username: "first",
          },
          {
            email: "second@example.com",
            ojAccounts: [{ handle: "sameHandle", platform: "luogu" }],
            username: "second",
          },
        ])
      )
    ).rejects.toThrow("Duplicate OJ handle");
    await expect(
      importUsersFromSystemSeedFile(
        db,
        createSeedFile([
          {
            email: "platform@example.com",
            ojAccounts: [
              { handle: "first", platform: "codeforces" },
              { handle: "second", platform: "codeforces" },
            ],
            username: "platform-user",
          },
        ])
      )
    ).rejects.toThrow("Duplicate OJ platform");
  });

  it("rejects null values and unknown fields", async () => {
    const db = await createServiceTestDb();
    const seed: SystemSeed = {
      problemSets: [],
      settings: {},
      users: [],
    };
    const seedFile = createSystemSeedFile(seed);

    await expect(
      importUsersFromSystemSeedFile(db, {
        ...seedFile,
        seed: {
          ...seedFile.seed,
          users: [
            {
              email: "null@example.com",
              profile: {
                realName: null,
              },
              username: "null-user",
            },
          ],
        },
      })
    ).rejects.toBeInstanceOf(SystemSeedFormatError);
    await expect(
      importUsersFromSystemSeedFile(db, {
        ...seedFile,
        seed: {
          ...seedFile.seed,
          users: [
            {
              email: "unknown@example.com",
              password: "secret",
              username: "unknown-user",
            },
          ],
        },
      })
    ).rejects.toBeInstanceOf(SystemSeedFormatError);
  });
});
