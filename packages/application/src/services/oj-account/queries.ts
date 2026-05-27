import type { Database } from "@hhuacm-dashboard/db";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { and, asc, eq } from "drizzle-orm";

interface OjAccountLookup {
  platform: OjPlatform;
  userId: string;
}

export const ojAccountFields = {
  handle: userOjAccount.handle,
  platform: userOjAccount.platform,
  profileUrl: userOjAccount.profileUrl,
} as const;

export const internalOjAccountFields = {
  id: userOjAccount.id,
  ...ojAccountFields,
} as const;

export const toPublicOjAccount = (account: {
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

export const getPublicOjAccountForUserPlatform = async (
  db: Database,
  input: OjAccountLookup
) =>
  (
    await db
      .select(ojAccountFields)
      .from(userOjAccount)
      .where(
        and(
          eq(userOjAccount.userId, input.userId),
          eq(userOjAccount.platform, input.platform)
        )
      )
      .limit(1)
  )[0] ?? null;
export const getInternalOjAccountForUserPlatform = async (
  db: Database,
  input: OjAccountLookup
) =>
  (
    await db
      .select(internalOjAccountFields)
      .from(userOjAccount)
      .where(
        and(
          eq(userOjAccount.userId, input.userId),
          eq(userOjAccount.platform, input.platform)
        )
      )
      .limit(1)
  )[0] ?? null;
