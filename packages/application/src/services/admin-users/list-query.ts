import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus } from "@hhuacm-dashboard/domain";
import { asc, eq, inArray } from "drizzle-orm";

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
      grade: userProfile.grade,
      id: user.id,
      major: userProfile.major,
      memberStatus: userProfile.memberStatus,
      realName: userProfile.realName,
      role: user.role,
      studentId: userProfile.studentId,
      username: user.username,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .orderBy(asc(user.username), asc(user.email), asc(user.id));

  const userIds = users.map((currentUser) => currentUser.id);
  const ojAccountsByUserId = await listOjAccountsForUsers(db, userIds);

  return users.map((currentUser) => ({
    ...currentUser,
    memberStatus: currentUser.memberStatus ?? defaultMemberStatus,
    ojAccounts: ojAccountsByUserId.get(currentUser.id) ?? [],
  }));
};
