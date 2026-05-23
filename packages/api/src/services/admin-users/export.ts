import { createHash } from "node:crypto";
import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { asc, eq, inArray } from "drizzle-orm";

import type {
  AdminUsersExport,
  AdminUsersExportOjAccount,
  AdminUsersExportUser,
  Database,
} from "./types";

const exportVersion = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (!(value && typeof value === "object")) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((result, key) => {
      if (!isRecord(value)) {
        return result;
      }

      const nextValue = value[key];
      if (nextValue !== undefined) {
        result[key] = canonicalize(nextValue);
      }
      return result;
    }, {});
};

const stringifyCanonicalJson = (value: unknown) =>
  JSON.stringify(canonicalize(value));

const hashCanonicalJson = (value: unknown) =>
  createHash("sha256").update(stringifyCanonicalJson(value)).digest("hex");

const groupOjAccountsByUserId = (
  accounts: Array<AdminUsersExportOjAccount & { userId: string }>
) => {
  const accountsByUserId = new Map<string, AdminUsersExportOjAccount[]>();

  for (const account of accounts) {
    const currentAccounts = accountsByUserId.get(account.userId) ?? [];
    currentAccounts.push({
      handle: account.handle,
      platform: account.platform,
    });
    accountsByUserId.set(account.userId, currentAccounts);
  }

  return accountsByUserId;
};

const listOjAccountsForUsers = async (db: Database, userIds: string[]) => {
  if (userIds.length === 0) {
    return new Map<string, AdminUsersExportOjAccount[]>();
  }

  const accounts = await db
    .select({
      handle: userOjAccount.handle,
      platform: userOjAccount.platform,
      userId: userOjAccount.userId,
    })
    .from(userOjAccount)
    .where(inArray(userOjAccount.userId, userIds))
    .orderBy(
      asc(userOjAccount.platform),
      asc(userOjAccount.handle),
      asc(userOjAccount.id)
    );

  return groupOjAccountsByUserId(accounts);
};

export const exportAdminUsers = async (
  db: Database
): Promise<AdminUsersExport> => {
  const users = await db
    .select({
      email: user.email,
      grade: userProfile.grade,
      id: user.id,
      major: userProfile.major,
      realName: userProfile.realName,
      studentId: userProfile.studentId,
      username: user.username,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .orderBy(asc(user.username), asc(user.email), asc(user.id));

  const userIds = users.map((currentUser) => currentUser.id);
  const accountsByUserId = await listOjAccountsForUsers(db, userIds);
  const exportUsers: AdminUsersExportUser[] = users.map((currentUser) => ({
    email: currentUser.email,
    grade: currentUser.grade,
    major: currentUser.major,
    ojAccounts: accountsByUserId.get(currentUser.id) ?? [],
    realName: currentUser.realName,
    studentId: currentUser.studentId,
    username: currentUser.username,
  }));
  const hash = hashCanonicalJson({
    users: exportUsers,
    version: exportVersion,
  });

  return {
    exportedAt: new Date().toISOString(),
    hash,
    users: exportUsers,
    version: exportVersion,
  };
};
