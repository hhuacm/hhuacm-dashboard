import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { asc, inArray } from "drizzle-orm";

import type { AdminUserOjAccount, Database } from "./types";

const groupOjAccountsByUserId = (
  accounts: Array<AdminUserOjAccount & { userId: string }>
) => {
  const ojAccountsByUserId = new Map<string, AdminUserOjAccount[]>();

  for (const account of accounts) {
    const currentAccounts = ojAccountsByUserId.get(account.userId) ?? [];
    currentAccounts.push({
      externalId: account.externalId,
      handle: account.handle,
      platform: account.platform,
    });
    ojAccountsByUserId.set(account.userId, currentAccounts);
  }

  return ojAccountsByUserId;
};

const listOjAccountsForUsers = async (db: Database, userIds: string[]) => {
  if (userIds.length === 0) {
    return new Map<string, AdminUserOjAccount[]>();
  }

  const ojAccounts = await db
    .select({
      externalId: userOjAccount.externalId,
      handle: userOjAccount.handle,
      platform: userOjAccount.platform,
      userId: userOjAccount.userId,
    })
    .from(userOjAccount)
    .where(inArray(userOjAccount.userId, userIds))
    .orderBy(asc(userOjAccount.platform));

  return groupOjAccountsByUserId(ojAccounts);
};

export const listAdminUsers = async (db: Database) => {
  const users = await db
    .select({
      email: user.email,
      grade: user.grade,
      id: user.id,
      major: user.major,
      memberStatus: user.memberStatus,
      realName: user.name,
      role: user.role,
      studentId: user.studentId,
      username: user.username,
    })
    .from(user)
    .orderBy(asc(user.username), asc(user.email), asc(user.id));

  const userIds = users.map((currentUser) => currentUser.id);
  const ojAccountsByUserId = await listOjAccountsForUsers(db, userIds);

  return users.map((currentUser) => ({
    ...currentUser,
    ojAccounts: ojAccountsByUserId.get(currentUser.id) ?? [],
  }));
};
