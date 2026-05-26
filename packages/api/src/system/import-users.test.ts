import { describe, expect, it } from "bun:test";
import { account, user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { refreshRequest } from "@hhuacm-dashboard/db/schema/refresh-request";
import { verifyPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";
import { codeforcesAccountStatsJob } from "../services/refresh/jobs/codeforces-account-stats";
import { luoguAccountStatsJob } from "../services/refresh/jobs/luogu-account-stats";
import { luoguProfileUrlJob } from "../services/refresh/jobs/luogu-profile-url";
import { userAwardsFromLuoguJob } from "../services/refresh/jobs/user-awards-from-luogu";
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

type Database = Awaited<ReturnType<typeof createServiceTestDb>>;

const codeforcesAccount = (handle: string) =>
  ({ handle, platform: "codeforces" }) as const;

const luoguAccount = (handle: string) =>
  ({ handle, platform: "luogu" }) as const;

const createSeedUser = (
  username: string,
  input: Partial<Omit<SystemSeedUser, "email" | "username">> & {
    email?: string;
  } = {}
): SystemSeedUser => ({
  email: input.email ?? `${username}@example.com`,
  username,
  ...input,
});

const createSeedFile = (users: SystemSeedUser[]) =>
  createSystemSeedFile({
    problemSets: [],
    settings: {},
    users,
  });

const createExistingUser = async (db: Database) => {
  await db.insert(user).values({
    email: "existing@example.com",
    id: "existing-user",
    name: "existing-user",
    username: "existing-user",
  });
};

const listUsers = async (db: Database) =>
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
      createSeedFile([createSeedUser("alice")])
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
        createSeedUser("admin", {
          profile: {
            grade: "24级",
            major: "计算机科学与技术",
            memberStatus: "active",
            realName: "Admin",
            studentId: "20240001",
          },
          role: "admin",
        }),
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
      grade: "24级",
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
        createSeedUser("selection-user", {
          ojAccounts: [codeforcesAccount("selectionCf")],
        }),
        createSeedUser("active-user", {
          ojAccounts: [luoguAccount("activeLuogu")],
          profile: {
            memberStatus: "active",
          },
        }),
        createSeedUser("retired-user", {
          ojAccounts: [codeforcesAccount("retiredCf")],
          profile: {
            memberStatus: "retired",
          },
        }),
        createSeedUser("frozen-user", {
          ojAccounts: [luoguAccount("frozenLuogu")],
          profile: {
            memberStatus: "frozen",
          },
        }),
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
          kind: codeforcesAccountStatsJob.kind,
          targetId: accountByHandle.get("selectionCf")?.id,
        },
        {
          kind: luoguAccountStatsJob.kind,
          targetId: accountByHandle.get("activeLuogu")?.id,
        },
        {
          kind: luoguProfileUrlJob.kind,
          targetId: accountByHandle.get("activeLuogu")?.id,
        },
        {
          kind: luoguProfileUrlJob.kind,
          targetId: accountByHandle.get("frozenLuogu")?.id,
        },
        {
          kind: userAwardsFromLuoguJob.kind,
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
          request.kind !== luoguProfileUrlJob.kind
      )
    ).toBe(false);
  });

  it("rejects importing into a non-empty user domain", async () => {
    const db = await createServiceTestDb();
    await createExistingUser(db);

    await expect(
      importUsersFromSystemSeedFile(
        db,
        createSeedFile([createSeedUser("next")])
      )
    ).rejects.toBeInstanceOf(SystemUserImportError);
  });

  it("rejects invalid system seed shapes", async () => {
    const validSeedFile = createSeedFile([createSeedUser("alice")]);
    const emptySeedFile = createSystemSeedFile({
      problemSets: [],
      settings: {},
      users: [],
    } satisfies SystemSeed);
    const seedFileWithUsers = (users: unknown[]) => ({
      ...emptySeedFile,
      seed: {
        ...emptySeedFile.seed,
        users,
      },
    });
    const cases: Array<{
      error: new (...args: never[]) => Error;
      input: unknown;
      message?: string;
    }> = [
      {
        error: SystemSeedFormatError,
        input: { ...validSeedFile, hash: "invalid" },
      },
      {
        error: SystemSeedFormatError,
        input: { ...validSeedFile, kind: "invalid" },
      },
      {
        error: SystemSeedFormatError,
        input: { ...validSeedFile, version: 2 },
      },
      {
        error: SystemUserImportError,
        input: createSeedFile([
          createSeedUser("same", { email: "first@example.com" }),
          createSeedUser("same", { email: "second@example.com" }),
        ]),
        message: "Duplicate username",
      },
      {
        error: SystemUserImportError,
        input: createSeedFile([
          createSeedUser("first", { email: "same@example.com" }),
          createSeedUser("second", { email: "same@example.com" }),
        ]),
        message: "Duplicate email",
      },
      {
        error: SystemUserImportError,
        input: createSeedFile([
          createSeedUser("first", { ojAccounts: [luoguAccount("sameHandle")] }),
          createSeedUser("second", {
            ojAccounts: [luoguAccount("sameHandle")],
          }),
        ]),
        message: "Duplicate OJ handle",
      },
      {
        error: SystemUserImportError,
        input: createSeedFile([
          createSeedUser("platform-user", {
            ojAccounts: [
              codeforcesAccount("first"),
              codeforcesAccount("second"),
            ],
          }),
        ]),
        message: "Duplicate OJ platform",
      },
      {
        error: SystemSeedFormatError,
        input: seedFileWithUsers([
          {
            email: "null@example.com",
            profile: {
              realName: null,
            },
            username: "null-user",
          },
        ]),
      },
      {
        error: SystemSeedFormatError,
        input: seedFileWithUsers([
          {
            email: "unknown@example.com",
            password: "secret",
            username: "unknown-user",
          },
        ]),
      },
    ];

    for (const { error, input, message } of cases) {
      const db = await createServiceTestDb();
      const expectation = expect(
        importUsersFromSystemSeedFile(db, input)
      ).rejects;

      if (message) {
        await expectation.toThrow(message);
      } else {
        await expectation.toBeInstanceOf(error);
      }
    }
  });
});
