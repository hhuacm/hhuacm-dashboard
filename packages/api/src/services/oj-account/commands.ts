import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { buildOjProfileUrl } from "../oj-profile-url";
import {
  assertNoHandleOwner,
  getExistingCurrentUserAccountMessage,
  normalizeOjHandle,
} from "./handle";
import {
  getInternalOjAccountForUserPlatform,
  getPublicOjAccountForUserPlatform,
  internalOjAccountFields,
  toPublicOjAccount,
} from "./queries";
import {
  replaceOjAccountStatsEffectsIfNeeded,
  requestOjAccountRefreshEffectsIfNeeded,
  resetOjAccountStatsEffects,
} from "./stats-effects";
import type { Database, OjAccountDeleteInput, OjAccountInput } from "./types";

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

  await requestOjAccountRefreshEffectsIfNeeded(db, account, input.userId);

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

  await replaceOjAccountStatsEffectsIfNeeded(db, account, input.userId);

  return toPublicOjAccount(account);
};

export const addOjAccount = async (db: Database, input: OjAccountInput) => {
  const existingCurrentUserAccount = await getPublicOjAccountForUserPlatform(
    db,
    input
  );

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
  const existingCurrentUserAccount = await getPublicOjAccountForUserPlatform(
    db,
    input
  );

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

  const existingAccount = await getInternalOjAccountForUserPlatform(db, input);

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

  await resetOjAccountStatsEffects(db, account);

  return toPublicOjAccount(account);
};
