import type { Database } from "@hhuacm-dashboard/db";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { and, eq } from "drizzle-orm";
import { ApplicationError } from "../../errors";
import {
  assertNoExternalIdOwner,
  getExistingCurrentUserAccountMessage,
} from "./external-id";
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

export interface OjAccountInput {
  externalId: string;
  platform: OjPlatform;
  userId: string;
}

interface OjAccountDeleteInput {
  platform: OjPlatform;
  userId: string;
}

const createOjAccount = async (db: Database, input: OjAccountInput) =>
  await db.transaction(async (tx) => {
    const [account] = await tx
      .insert(userOjAccount)
      .values({
        externalId: input.externalId,
        handle: input.externalId,
        platform: input.platform,
        userId: input.userId,
      })
      .returning(internalOjAccountFields);

    if (!account) {
      throw new ApplicationError({ code: "INTERNAL_SERVER_ERROR" });
    }

    await requestOjAccountRefreshEffectsIfNeeded(tx, account, input.userId);

    return toPublicOjAccount(account);
  });

const updateExistingOjAccount = async (db: Database, input: OjAccountInput) =>
  await db.transaction(async (tx) => {
    const [account] = await tx
      .update(userOjAccount)
      .set({
        externalId: input.externalId,
        handle: input.externalId,
      })
      .where(
        and(
          eq(userOjAccount.userId, input.userId),
          eq(userOjAccount.platform, input.platform)
        )
      )
      .returning(internalOjAccountFields);

    if (!account) {
      throw new ApplicationError({ code: "NOT_FOUND" });
    }

    await replaceOjAccountStatsEffectsIfNeeded(tx, account, input.userId);

    return toPublicOjAccount(account);
  });

export const addOjAccount = async (db: Database, input: OjAccountInput) => {
  const existingCurrentUserAccount = await getPublicOjAccountForUserPlatform(
    db,
    input
  );

  if (existingCurrentUserAccount) {
    throw new ApplicationError({
      code: "CONFLICT",
      message: getExistingCurrentUserAccountMessage(existingCurrentUserAccount),
    });
  }

  await assertNoExternalIdOwner(db, input, {});

  return await createOjAccount(db, input);
};

export const updateOjAccount = async (db: Database, input: OjAccountInput) => {
  const existingCurrentUserAccount = await getPublicOjAccountForUserPlatform(
    db,
    input
  );

  if (!existingCurrentUserAccount) {
    throw new ApplicationError({
      code: "NOT_FOUND",
      message: `OJ account does not exist: ${input.platform}`,
    });
  }

  await assertNoExternalIdOwner(db, input, { excludeUserId: input.userId });

  return await updateExistingOjAccount(db, input);
};

export const upsertOjAccount = async (db: Database, input: OjAccountInput) => {
  await assertNoExternalIdOwner(db, input, { excludeUserId: input.userId });

  const existingAccount = await getInternalOjAccountForUserPlatform(db, input);

  if (existingAccount) {
    return await updateExistingOjAccount(db, input);
  }

  return await createOjAccount(db, input);
};

export const deleteOjAccount = async (
  db: Database,
  input: OjAccountDeleteInput
) =>
  await db.transaction(async (tx) => {
    const [account] = await tx
      .delete(userOjAccount)
      .where(
        and(
          eq(userOjAccount.userId, input.userId),
          eq(userOjAccount.platform, input.platform)
        )
      )
      .returning(internalOjAccountFields);

    if (!account) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        message: `OJ account does not exist: ${input.platform}`,
      });
    }

    await resetOjAccountStatsEffects(tx, account);

    return toPublicOjAccount(account);
  });
