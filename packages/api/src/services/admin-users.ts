import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  memberStatuses,
  memberStatusLabels,
  type OjPlatform,
  ojPlatformLabels,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  type SQL,
  sql,
} from "drizzle-orm";

import type { Context } from "../context";
import {
  listInternalOjAccountsByUserId,
  ojAccountFields,
} from "./oj-account/queries";
import { clearCodeforcesStatsIfNeeded } from "./oj-account/stats-effects";
import { getTargetUser, profileFields } from "./profile";

type Database = Context["db"];

export type AdminUsersSortColumn =
  | "email"
  | "grade"
  | "major"
  | "memberStatus"
  | "realName"
  | "studentId"
  | "username";

interface AdminUsersListInput {
  filters?:
    | {
        grades?: string[];
        memberStatuses?: (typeof memberStatuses)[number][];
        ojPlatforms?: OjPlatform[];
      }
    | undefined;
  page: number;
  pageSize: number;
  sort?:
    | {
        column: AdminUsersSortColumn;
        direction: "ascending" | "descending";
      }
    | undefined;
}

export interface AdminUserOjAccount {
  handle: string;
  platform: OjPlatform;
  profileUrl: string;
}

const usernameSortExpression = sql<string>`coalesce(${user.username}, ${user.name}, '')`;
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

export const getAdminUsersOrderBy = (sort: AdminUsersListInput["sort"]) => {
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

export const getAdminUser = async (db: Database, userId: string) => {
  const targetUser = await getTargetUser(db, userId);
  const [profile] = await db
    .select(profileFields)
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);
  const ojAccounts = await db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(eq(userOjAccount.userId, userId))
    .orderBy(asc(userOjAccount.platform));

  return {
    ...targetUser,
    ojAccounts,
    profile: {
      grade: profile?.grade ?? null,
      major: profile?.major ?? null,
      memberStatus: profile?.memberStatus ?? defaultMemberStatus,
      realName: profile?.realName ?? null,
      studentId: profile?.studentId ?? null,
    },
  };
};

export const listAdminUsers = async (
  db: Database,
  input: AdminUsersListInput
) => {
  const offset = (input.page - 1) * input.pageSize;
  const whereCondition = getAdminUsersWhereCondition(db, input.filters);
  const [totalRow] = await db
    .select({
      total: sql<number>`count(${user.id})`.mapWith(Number),
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(whereCondition);

  const users = await db
    .select({
      email: user.email,
      grade: userProfile.grade,
      id: user.id,
      major: userProfile.major,
      memberStatus: userProfile.memberStatus,
      name: user.name,
      realName: userProfile.realName,
      role: user.role,
      studentId: userProfile.studentId,
      username: user.username,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(whereCondition)
    .orderBy(...getAdminUsersOrderBy(input.sort))
    .limit(input.pageSize)
    .offset(offset);

  const userIds = users.map((currentUser) => currentUser.id);
  const ojAccounts =
    userIds.length > 0
      ? await db
          .select({
            handle: userOjAccount.handle,
            platform: userOjAccount.platform,
            profileUrl: userOjAccount.profileUrl,
            userId: userOjAccount.userId,
          })
          .from(userOjAccount)
          .where(inArray(userOjAccount.userId, userIds))
          .orderBy(asc(userOjAccount.platform))
      : [];
  const ojAccountsByUserId = new Map<string, AdminUserOjAccount[]>();

  for (const account of ojAccounts) {
    const currentAccounts = ojAccountsByUserId.get(account.userId) ?? [];
    currentAccounts.push({
      handle: account.handle,
      platform: account.platform,
      profileUrl: account.profileUrl,
    });
    ojAccountsByUserId.set(account.userId, currentAccounts);
  }

  return {
    items: users.map((currentUser) => ({
      ...currentUser,
      memberStatus: currentUser.memberStatus ?? defaultMemberStatus,
      ojAccounts: ojAccountsByUserId.get(currentUser.id) ?? [],
    })),
    page: input.page,
    pageSize: input.pageSize,
    total: totalRow?.total ?? 0,
  };
};

export const getAdminUsersMetadata = async (db: Database) => {
  const gradeRows = await db
    .select({ value: userProfile.grade })
    .from(userProfile)
    .where(isNotNull(userProfile.grade))
    .groupBy(userProfile.grade)
    .orderBy(asc(userProfile.grade));

  return {
    grades: gradeRows.flatMap((row) =>
      row.value ? [{ label: row.value, value: row.value }] : []
    ),
    memberStatuses: memberStatuses.map((status) => ({
      label: memberStatusLabels[status],
      value: status,
    })),
    ojPlatforms: ojPlatforms.map((platform) => ({
      label: ojPlatformLabels[platform],
      value: platform,
    })),
  };
};

export const deleteAdminUser = async (
  db: Database,
  input: { userId: string; usernameConfirmation: string }
) => {
  const targetUser = await getTargetUser(db, input.userId);

  if (targetUser.role === "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin users cannot be deleted from the admin panel",
    });
  }

  const [targetProfile] = await db
    .select({ memberStatus: userProfile.memberStatus })
    .from(userProfile)
    .where(eq(userProfile.userId, input.userId))
    .limit(1);
  const targetMemberStatus = targetProfile?.memberStatus ?? defaultMemberStatus;

  if (targetMemberStatus !== "frozen") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only frozen users can be deleted from the admin panel",
    });
  }

  if (input.usernameConfirmation !== targetUser.username) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Username confirmation does not match",
    });
  }

  const targetOjAccounts = await listInternalOjAccountsByUserId(
    db,
    input.userId
  );

  for (const account of targetOjAccounts) {
    await clearCodeforcesStatsIfNeeded(db, account);
  }

  const [deletedUser] = await db
    .delete(user)
    .where(eq(user.id, input.userId))
    .returning({
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username,
    });

  if (!deletedUser) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return deletedUser;
};
