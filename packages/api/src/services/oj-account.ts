import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, ne } from "drizzle-orm";

import type { Context } from "../context";
import { deleteCodeforcesStats } from "./codeforces/stats-cache";
import { buildOjProfileUrl } from "./oj-profile-url";
import {
  deleteCodeforcesAccountStatsRefreshJob,
  enqueueCodeforcesAccountStatsRefresh,
} from "./refresh/queue";

type Database = Context["db"];

export const ojAccountFields = {
  handle: userOjAccount.handle,
  platform: userOjAccount.platform,
  profileUrl: userOjAccount.profileUrl,
} as const;

export const internalOjAccountFields = {
  id: userOjAccount.id,
  ...ojAccountFields,
} as const;

interface OjAccountInput {
  handle: string;
  platform: OjPlatform;
  userId: string;
}

interface OjAccountDeleteInput {
  platform: OjPlatform;
  userId: string;
}

export const normalizeOjHandle = (handle: string) => handle.toLowerCase();

const getExistingCurrentUserAccountMessage = (account: {
  handle: string;
  platform: string;
}) => `OJ account already exists: ${account.platform} ${account.handle}`;

const getOjHandleConflictMessage = (account: {
  handle: string;
  platform: string;
}) => `OJ handle already exists: ${account.platform} ${account.handle}`;

const toPublicOjAccount = (account: {
  handle: string;
  platform: OjPlatform;
  profileUrl: string;
}) => ({
  handle: account.handle,
  platform: account.platform,
  profileUrl: account.profileUrl,
});

export const listOjAccountsByUserId = (db: Database, userId: string) =>
  db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(eq(userOjAccount.userId, userId))
    .orderBy(asc(userOjAccount.platform));

export const listInternalOjAccountsByUserId = (db: Database, userId: string) =>
  db
    .select(internalOjAccountFields)
    .from(userOjAccount)
    .where(eq(userOjAccount.userId, userId))
    .orderBy(asc(userOjAccount.platform));

export const clearCodeforcesStatsIfNeeded = async (
  db: Database,
  account: { id: string; platform: OjPlatform }
) => {
  if (account.platform === "codeforces") {
    await deleteCodeforcesStats(db, account.id);
    await deleteCodeforcesAccountStatsRefreshJob(db, account.id);
  }
};

const enqueueCodeforcesStatsIfNeeded = async (
  db: Database,
  account: { id: string; platform: OjPlatform }
) => {
  if (account.platform === "codeforces") {
    await enqueueCodeforcesAccountStatsRefresh(db, account.id);
  }
};

const assertNoHandleOwner = async (
  db: Database,
  input: OjAccountInput,
  options: { excludeUserId?: string }
) => {
  const conditions = [
    eq(userOjAccount.platform, input.platform),
    eq(userOjAccount.normalizedHandle, normalizeOjHandle(input.handle)),
  ];

  if (options.excludeUserId) {
    conditions.push(ne(userOjAccount.userId, options.excludeUserId));
  }

  const [existingHandleOwner] = await db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(and(...conditions))
    .limit(1);

  if (existingHandleOwner) {
    throw new TRPCError({
      code: "CONFLICT",
      message: getOjHandleConflictMessage(existingHandleOwner),
    });
  }
};

const createOjAccount = async (db: Database, input: OjAccountInput) => {
  const normalizedHandle = normalizeOjHandle(input.handle);
  const profileUrl = await buildOjProfileUrl(input.platform, input.handle);
  const [account] = await db
    .insert(userOjAccount)
    .values({
      handle: input.handle,
      normalizedHandle,
      platform: input.platform,
      profileUrl,
      userId: input.userId,
    })
    .returning(internalOjAccountFields);

  if (!account) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  await clearCodeforcesStatsIfNeeded(db, account);
  await enqueueCodeforcesStatsIfNeeded(db, account);

  return toPublicOjAccount(account);
};

const updateExistingOjAccount = async (db: Database, input: OjAccountInput) => {
  const normalizedHandle = normalizeOjHandle(input.handle);
  const profileUrl = await buildOjProfileUrl(input.platform, input.handle);
  const [account] = await db
    .update(userOjAccount)
    .set({
      handle: input.handle,
      normalizedHandle,
      profileUrl,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userOjAccount.userId, input.userId),
        eq(userOjAccount.platform, input.platform)
      )
    )
    .returning(internalOjAccountFields);

  if (!account) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  await clearCodeforcesStatsIfNeeded(db, account);
  await enqueueCodeforcesStatsIfNeeded(db, account);

  return toPublicOjAccount(account);
};

export const addOjAccount = async (db: Database, input: OjAccountInput) => {
  const [existingCurrentUserAccount] = await db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.userId, input.userId),
        eq(userOjAccount.platform, input.platform)
      )
    )
    .limit(1);

  if (existingCurrentUserAccount) {
    throw new TRPCError({
      code: "CONFLICT",
      message: getExistingCurrentUserAccountMessage(existingCurrentUserAccount),
    });
  }

  await assertNoHandleOwner(db, input, {});

  return await createOjAccount(db, input);
};

export const updateOjAccount = async (db: Database, input: OjAccountInput) => {
  const [existingCurrentUserAccount] = await db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.userId, input.userId),
        eq(userOjAccount.platform, input.platform)
      )
    )
    .limit(1);

  if (!existingCurrentUserAccount) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `OJ account does not exist: ${input.platform}`,
    });
  }

  await assertNoHandleOwner(db, input, { excludeUserId: input.userId });

  return await updateExistingOjAccount(db, input);
};

export const upsertOjAccount = async (db: Database, input: OjAccountInput) => {
  await assertNoHandleOwner(db, input, { excludeUserId: input.userId });

  const [existingAccount] = await db
    .select(internalOjAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.userId, input.userId),
        eq(userOjAccount.platform, input.platform)
      )
    )
    .limit(1);

  if (existingAccount) {
    return await updateExistingOjAccount(db, input);
  }

  return await createOjAccount(db, input);
};

export const deleteOjAccount = async (
  db: Database,
  input: OjAccountDeleteInput
) => {
  const [account] = await db
    .delete(userOjAccount)
    .where(
      and(
        eq(userOjAccount.userId, input.userId),
        eq(userOjAccount.platform, input.platform)
      )
    )
    .returning(internalOjAccountFields);

  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `OJ account does not exist: ${input.platform}`,
    });
  }

  await clearCodeforcesStatsIfNeeded(db, account);

  return toPublicOjAccount(account);
};
