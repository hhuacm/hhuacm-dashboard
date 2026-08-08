import { randomUUID } from "node:crypto";
import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import { account, user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { hashPassword } from "better-auth/crypto";
import { requestOjAccountRefreshEffectsIfNeeded } from "../services/oj-account/stats-effects";
import { parseSystemSeedFile, type SystemSeedUser } from "./seed-format";

type Transaction = DatabaseTransaction;
type UserImportDatabase = Database | Transaction;

const defaultImportedUserPassword = "12345678";

export interface ImportUsersResult {
  adminCount: number;
  ojAccountCount: number;
  refreshRequestCount: number;
  userCount: number;
}

export class SystemUserImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SystemUserImportError";
  }
}

const getFirstUserDomainRow = async (db: UserImportDatabase) => {
  const [existingUser] = await db.select({ id: user.id }).from(user).limit(1);
  if (existingUser) {
    return "user";
  }

  const [existingAccount] = await db
    .select({ id: account.id })
    .from(account)
    .limit(1);
  if (existingAccount) {
    return "account";
  }

  const [existingOjAccount] = await db
    .select({ id: userOjAccount.id })
    .from(userOjAccount)
    .limit(1);
  if (existingOjAccount) {
    return "user_oj_account";
  }

  return null;
};

const assertUserDomainIsEmpty = async (db: UserImportDatabase) => {
  const nonEmptyTable = await getFirstUserDomainRow(db);

  if (nonEmptyTable) {
    throw new SystemUserImportError(
      `Cannot import users into a non-empty user domain: ${nonEmptyTable}`
    );
  }
};

const assertUniqueValue = (
  values: Set<string>,
  value: string,
  message: string
) => {
  if (values.has(value)) {
    throw new SystemUserImportError(message);
  }

  values.add(value);
};

const validateSeedUsers = (users: SystemSeedUser[]) => {
  const usernames = new Set<string>();
  const emails = new Set<string>();
  const platformExternalIds = new Set<string>();

  for (const seedUser of users) {
    assertUniqueValue(
      usernames,
      seedUser.username,
      `Duplicate username in system seed: ${seedUser.username}`
    );
    assertUniqueValue(
      emails,
      seedUser.email,
      `Duplicate email in system seed: ${seedUser.email}`
    );

    const userPlatforms = new Set<OjPlatform>();

    for (const accountSeed of seedUser.ojAccounts ?? []) {
      assertUniqueValue(
        userPlatforms,
        accountSeed.platform,
        `Duplicate OJ platform for ${seedUser.username}: ${accountSeed.platform}`
      );
      assertUniqueValue(
        platformExternalIds,
        `${accountSeed.platform}\0${accountSeed.externalId}`,
        `Duplicate OJ external ID in system seed: ${accountSeed.platform}/${accountSeed.externalId}`
      );
    }
  }
};

const createImportedUser = async (
  db: UserImportDatabase,
  input: {
    passwordHash: string;
    seedUser: SystemSeedUser;
  }
) => {
  const userId = randomUUID();

  await db.insert(user).values({
    email: input.seedUser.email,
    emailVerified: true,
    grade: input.seedUser.grade,
    id: userId,
    major: input.seedUser.major,
    ...(input.seedUser.memberStatus
      ? { memberStatus: input.seedUser.memberStatus }
      : {}),
    name: input.seedUser.realName,
    ...(input.seedUser.role ? { role: input.seedUser.role } : {}),
    studentId: input.seedUser.studentId,
    username: input.seedUser.username,
  });

  await db.insert(account).values({
    accountId: userId,
    id: randomUUID(),
    password: input.passwordHash,
    providerId: "credential",
    userId,
  });

  let refreshRequestCount = 0;

  for (const accountSeed of input.seedUser.ojAccounts ?? []) {
    const createdOjAccount = await db
      .insert(userOjAccount)
      .values({
        externalId: accountSeed.externalId,
        handle: accountSeed.externalId,
        platform: accountSeed.platform,
        userId,
      })
      .returning({
        id: userOjAccount.id,
        platform: userOjAccount.platform,
      })
      .get();

    refreshRequestCount += await requestOjAccountRefreshEffectsIfNeeded(
      db,
      createdOjAccount,
      userId
    );
  }

  return { refreshRequestCount };
};

export const importUsersFromSystemSeedFile = async (
  db: Database,
  input: unknown
): Promise<ImportUsersResult> => {
  const seedFile = parseSystemSeedFile(input);
  const { users } = seedFile.seed;

  validateSeedUsers(users);

  const usersWithPasswordHashes = await Promise.all(
    users.map(async (seedUser) => ({
      passwordHash: await hashPassword(defaultImportedUserPassword),
      seedUser,
    }))
  );

  return await db.transaction(async (tx) => {
    await assertUserDomainIsEmpty(tx);

    const summary: ImportUsersResult = {
      adminCount: 0,
      ojAccountCount: 0,
      refreshRequestCount: 0,
      userCount: users.length,
    };

    for (const { passwordHash, seedUser } of usersWithPasswordHashes) {
      const result = await createImportedUser(tx, {
        passwordHash,
        seedUser,
      });

      if (seedUser.role === "admin") {
        summary.adminCount += 1;
      }

      summary.ojAccountCount += seedUser.ojAccounts?.length ?? 0;
      summary.refreshRequestCount += result.refreshRequestCount;
    }

    return summary;
  });
};
