import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { defaultMemberStatus } from "@hhuacm-dashboard/domain";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  type SQL,
  sql,
} from "drizzle-orm";

import type {
  AdminUserOjAccount,
  AdminUsersListInput,
  AdminUsersSortColumn,
  Database,
} from "./types";

const usernameSortExpression = sql<string>`coalesce(${user.username}, '')`;
const memberStatusSortExpression = sql<string>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const getAdminUsersSortExpression = (column: AdminUsersSortColumn) => {
  if (column === "email") {
    return user.email;
  }

  if (column === "grade") {
    return userProfile.grade;
  }

  if (column === "major") {
    return userProfile.major;
  }

  if (column === "memberStatus") {
    return memberStatusSortExpression;
  }

  if (column === "realName") {
    return userProfile.realName;
  }

  if (column === "studentId") {
    return userProfile.studentId;
  }

  return usernameSortExpression;
};

const getAdminUsersOrderBy = (sort: AdminUsersListInput["sort"]) => {
  if (!sort) {
    return [asc(usernameSortExpression), asc(user.email), asc(user.id)];
  }

  const sortExpression = getAdminUsersSortExpression(sort.column);
  const primaryOrder =
    sort.direction === "descending"
      ? desc(sortExpression)
      : asc(sortExpression);

  if (sort.column === "username") {
    return [primaryOrder, asc(user.email), asc(user.id)];
  }

  return [primaryOrder, asc(user.id)];
};

const getAdminUsersWhereCondition = (
  db: Database,
  filters: AdminUsersListInput["filters"]
) => {
  const filterConditions: SQL[] = [];

  if (filters?.memberStatuses?.length) {
    filterConditions.push(
      inArray(memberStatusSortExpression, filters.memberStatuses)
    );
  }

  if (filters?.grades?.length) {
    filterConditions.push(inArray(userProfile.grade, filters.grades));
  }

  if (filters?.ojPlatforms?.length) {
    filterConditions.push(
      exists(
        db
          .select({ id: userOjAccount.id })
          .from(userOjAccount)
          .where(
            and(
              eq(userOjAccount.userId, user.id),
              inArray(userOjAccount.platform, filters.ojPlatforms)
            )
          )
      )
    );
  }

  return filterConditions.length > 0 ? and(...filterConditions) : undefined;
};

const groupOjAccountsByUserId = (
  accounts: Array<AdminUserOjAccount & { userId: string }>
) => {
  const ojAccountsByUserId = new Map<string, AdminUserOjAccount[]>();

  for (const account of accounts) {
    const currentAccounts = ojAccountsByUserId.get(account.userId) ?? [];
    currentAccounts.push({
      handle: account.handle,
      platform: account.platform,
      profileUrl: account.profileUrl,
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
      handle: userOjAccount.handle,
      platform: userOjAccount.platform,
      profileUrl: userOjAccount.profileUrl,
      userId: userOjAccount.userId,
    })
    .from(userOjAccount)
    .where(inArray(userOjAccount.userId, userIds))
    .orderBy(asc(userOjAccount.platform));

  return groupOjAccountsByUserId(ojAccounts);
};

export const listAdminUsers = async (
  db: Database,
  input: AdminUsersListInput
) => {
  const whereCondition = getAdminUsersWhereCondition(db, input.filters);
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
    .where(whereCondition)
    .orderBy(...getAdminUsersOrderBy(input.sort));

  const userIds = users.map((currentUser) => currentUser.id);
  const ojAccountsByUserId = await listOjAccountsForUsers(db, userIds);

  return {
    items: users.map((currentUser) => ({
      ...currentUser,
      memberStatus: currentUser.memberStatus ?? defaultMemberStatus,
      ojAccounts: ojAccountsByUserId.get(currentUser.id) ?? [],
    })),
    total: users.length,
  };
};
