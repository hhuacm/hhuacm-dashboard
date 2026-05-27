import { randomUUID } from "node:crypto";
import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import { account, user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  isCurrentMemberStatus,
  type OjPlatform,
} from "@hhuacm-dashboard/domain";
import { hashPassword } from "better-auth/crypto";
import { codeforcesAccountStatsJob } from "../refresh/jobs/codeforces-account-stats";
import { luoguAccountStatsJob } from "../refresh/jobs/luogu-account-stats";
import { luoguProfileUrlJob } from "../refresh/jobs/luogu-profile-url";
import { userAwardsFromLuoguJob } from "../refresh/jobs/user-awards-from-luogu";
import { parseSystemSeedFile, type SystemSeedUser } from "./seed-format";

type Transaction = DatabaseTransaction;
type UserImportDatabase = Database | Transaction;

const defaultImportedUserPassword = "12345678";

export interface ImportUsersResult {
  adminCount: number;
  ojAccountCount: number;
  profileCount: number;
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

  const [existingProfile] = await db
    .select({ userId: userProfile.userId })
    .from(userProfile)
    .limit(1);
  if (existingProfile) {
    return "user_profile";
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
  const platformHandles = new Set<string>();

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
        platformHandles,
        `${accountSeed.platform}\0${accountSeed.handle}`,
        `Duplicate OJ handle in system seed: ${accountSeed.platform}/${accountSeed.handle}`
      );
    }
  }
};

const isCurrentMemberSeedUser = (seedUser: SystemSeedUser) => {
  const memberStatus = seedUser.profile?.memberStatus ?? defaultMemberStatus;

  return isCurrentMemberStatus(memberStatus);
};

const countCreatedRefreshRequest = async (created: Promise<boolean>) =>
  (await created) ? 1 : 0;

const enqueueImportedOjAccountRefreshJobs = async (
  db: UserImportDatabase,
  input: {
    accountId: string;
    isCurrentMember: boolean;
    platform: OjPlatform;
  }
) => {
  let count = 0;

  if (input.platform === "codeforces" && input.isCurrentMember) {
    count += await countCreatedRefreshRequest(
      codeforcesAccountStatsJob.enqueue(db, input.accountId)
    );
  }

  if (input.platform === "luogu") {
    count += await countCreatedRefreshRequest(
      luoguProfileUrlJob.enqueue(db, input.accountId)
    );

    if (input.isCurrentMember) {
      count += await countCreatedRefreshRequest(
        luoguAccountStatsJob.enqueue(db, input.accountId)
      );
      count += await countCreatedRefreshRequest(
        userAwardsFromLuoguJob.enqueue(db, input.accountId)
      );
    }
  }

  return count;
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
    id: userId,
    name: input.seedUser.username,
    ...(input.seedUser.role ? { role: input.seedUser.role } : {}),
    username: input.seedUser.username,
  });

  await db.insert(account).values({
    accountId: userId,
    id: randomUUID(),
    password: input.passwordHash,
    providerId: "credential",
    userId,
  });

  if (input.seedUser.profile) {
    await db.insert(userProfile).values({
      ...input.seedUser.profile,
      userId,
    });
  }

  let refreshRequestCount = 0;
  const shouldRefreshAccounts = isCurrentMemberSeedUser(input.seedUser);

  for (const accountSeed of input.seedUser.ojAccounts ?? []) {
    const [createdOjAccount] = await db
      .insert(userOjAccount)
      .values({
        handle: accountSeed.handle,
        platform: accountSeed.platform,
        userId,
      })
      .returning({
        id: userOjAccount.id,
        platform: userOjAccount.platform,
      });

    if (!createdOjAccount) {
      continue;
    }

    refreshRequestCount += await enqueueImportedOjAccountRefreshJobs(db, {
      accountId: createdOjAccount.id,
      isCurrentMember: shouldRefreshAccounts,
      platform: createdOjAccount.platform,
    });
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

  const passwordHashesByUsername = new Map(
    await Promise.all(
      users.map(
        async (seedUser) =>
          [
            seedUser.username,
            await hashPassword(defaultImportedUserPassword),
          ] as const
      )
    )
  );

  return await db.transaction(async (tx) => {
    await assertUserDomainIsEmpty(tx);

    const summary: ImportUsersResult = {
      adminCount: 0,
      ojAccountCount: 0,
      profileCount: 0,
      refreshRequestCount: 0,
      userCount: users.length,
    };

    for (const seedUser of users) {
      const passwordHash = passwordHashesByUsername.get(seedUser.username);

      if (!passwordHash) {
        throw new SystemUserImportError(
          `Missing password hash for ${seedUser.username}`
        );
      }

      const result = await createImportedUser(tx, {
        passwordHash,
        seedUser,
      });

      if (seedUser.role === "admin") {
        summary.adminCount += 1;
      }

      if (seedUser.profile) {
        summary.profileCount += 1;
      }

      summary.ojAccountCount += seedUser.ojAccounts?.length ?? 0;
      summary.refreshRequestCount += result.refreshRequestCount;
    }

    return summary;
  });
};
