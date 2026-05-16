import { arch, platform, release } from "node:os";

import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import {
  ojPlatforms,
  userOjAccount,
} from "@hhuacm-dashboard/db/schema/oj-account";
import {
  memberStatuses,
  userProfile,
} from "@hhuacm-dashboard/db/schema/profile";
import { refreshJob } from "@hhuacm-dashboard/db/schema/refresh-job";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  ne,
  type SQL,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../index";
import {
  deleteCodeforcesStats,
  getCodeforcesStatsForProfile,
} from "../services/codeforces/stats-cache";
import type { PublicCodeforcesStats } from "../services/codeforces/types";
import {
  codeforcesAccountStatsJobKind,
  ojAccountTargetType,
  refreshDefaults,
} from "../services/refresh/constants";
import {
  deleteCodeforcesAccountStatsRefreshJob,
  enqueueCodeforcesAccountStatsRefresh,
} from "../services/refresh/queue";

const serverStartedAt = new Date();
const defaultMemberStatus = memberStatuses[0];

const profileFields = {
  grade: userProfile.grade,
  major: userProfile.major,
  memberStatus: userProfile.memberStatus,
  realName: userProfile.realName,
  studentId: userProfile.studentId,
} as const;

const gradeOtherOption = "其他";
const gradeLookbackYears = 7;

const getGradeOptions = (currentDate = new Date()) => {
  const currentYear = currentDate.getFullYear();
  const startYear = currentYear - gradeLookbackYears;
  const yearOptions = Array.from(
    { length: gradeLookbackYears + 1 },
    (_, index) => `${startYear + index}级`
  );

  return [...yearOptions, gradeOtherOption];
};

const gradeSchema = z
  .string()
  .refine((grade) => !grade || getGradeOptions().includes(grade), {
    message: "Invalid grade",
  });

const profileInputSchema = z.object({
  grade: gradeSchema,
  major: z.string(),
  realName: z.string(),
  studentId: z.string(),
});

const profileUpdateInputSchema = profileInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Profile update requires at least one field",
  });

const adminUsersSortColumnSchema = z.enum([
  "email",
  "grade",
  "major",
  "memberStatus",
  "realName",
  "studentId",
  "username",
]);

const adminUsersSortDirectionSchema = z.enum(["ascending", "descending"]);

const adminUsersListInputSchema = z.object({
  filters: z
    .object({
      grades: z.array(z.string().trim().min(1)).optional(),
      memberStatuses: z.array(z.enum(memberStatuses)).optional(),
      ojPlatforms: z.array(z.enum(ojPlatforms)).optional(),
    })
    .optional(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(5).max(80),
  sort: z
    .object({
      column: adminUsersSortColumnSchema,
      direction: adminUsersSortDirectionSchema,
    })
    .optional(),
});

type AdminUsersListInput = z.infer<typeof adminUsersListInputSchema>;
type AdminUsersSortColumn = z.infer<typeof adminUsersSortColumnSchema>;

interface AdminUserOjAccount {
  handle: string;
  platform: (typeof ojPlatforms)[number];
  profileUrl: string;
}

interface PublicOjAccount {
  codeforces?: PublicCodeforcesStats | null;
  handle: string;
  platform: (typeof ojPlatforms)[number];
  profileUrl: string;
}

type CodeforcesRankStatus =
  | "empty"
  | "failed"
  | "missing-account"
  | "ready"
  | "refreshing"
  | "stale";

const adminMemberStatusLabels = {
  active: "服役中",
  frozen: "已冻结",
  retired: "已退役",
  selection: "选拔中",
} as const satisfies Record<(typeof memberStatuses)[number], string>;

const adminOjPlatformLabels = {
  atcoder: "AtCoder",
  codeforces: "Codeforces",
  luogu: "洛谷",
  nowcoder: "牛客",
} as const satisfies Record<(typeof ojPlatforms)[number], string>;

const usernameSortExpression = sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name}, '')`;
const memberStatusSortExpression = sql<string>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

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

const ojAccountFields = {
  handle: userOjAccount.handle,
  platform: userOjAccount.platform,
  profileUrl: userOjAccount.profileUrl,
} as const;

const internalOjAccountFields = {
  id: userOjAccount.id,
  ...ojAccountFields,
} as const;

const ojPlatformSchema = z.enum(ojPlatforms);

const trimmedStringSchema = z.string().trim().min(1);

const ojAccountInputSchema = z.object({
  handle: trimmedStringSchema,
  platform: ojPlatformSchema,
});

const ojAccountPlatformInputSchema = z.object({
  platform: ojPlatformSchema,
});

const profileGetInputSchema = z.object({
  username: trimmedStringSchema,
});

const adminUserInputSchema = z.object({
  userId: trimmedStringSchema,
});

const adminUserDeleteInputSchema = adminUserInputSchema.extend({
  usernameConfirmation: trimmedStringSchema,
});

const adminProfileInputSchema = profileInputSchema.extend({
  memberStatus: z.enum(memberStatuses),
});

const adminProfileUpdateInputSchema = adminProfileInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Profile update requires at least one field",
  });

const adminUserProfileUpdateInputSchema = adminUserInputSchema.extend({
  values: adminProfileUpdateInputSchema,
});

const adminUserOjAccountInputSchema = adminUserInputSchema.extend({
  handle: trimmedStringSchema,
  platform: ojPlatformSchema,
});

const adminUserOjAccountDeleteInputSchema = adminUserInputSchema.extend({
  platform: ojPlatformSchema,
});

const normalizeHandle = (handle: string) => handle.toLowerCase();

const getTargetUser = async (db: Context["db"], userId: string) => {
  const [targetUser] = await db
    .select({
      displayUsername: user.displayUsername,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!targetUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `User does not exist: ${userId}`,
    });
  }

  return targetUser;
};

const getTargetUserByUsername = async (db: Context["db"], username: string) => {
  const [targetUser] = await db
    .select({
      displayUsername: user.displayUsername,
      email: user.email,
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username,
    })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  if (!targetUser?.username) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `User does not exist: ${username}`,
    });
  }

  return targetUser;
};

const getProfileByUserId = async (db: Context["db"], userId: string) => {
  const [profile] = await db
    .select(profileFields)
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return {
    grade: profile?.grade ?? null,
    major: profile?.major ?? null,
    memberStatus: profile?.memberStatus ?? defaultMemberStatus,
    realName: profile?.realName ?? null,
    studentId: profile?.studentId ?? null,
  };
};

const listOjAccountsByUserId = (db: Context["db"], userId: string) =>
  db
    .select(ojAccountFields)
    .from(userOjAccount)
    .where(eq(userOjAccount.userId, userId))
    .orderBy(asc(userOjAccount.platform));

const listInternalOjAccountsByUserId = (db: Context["db"], userId: string) =>
  db
    .select(internalOjAccountFields)
    .from(userOjAccount)
    .where(eq(userOjAccount.userId, userId))
    .orderBy(asc(userOjAccount.platform));

const attachPublicOjAccountData = async (
  db: Context["db"],
  accounts: Awaited<ReturnType<typeof listInternalOjAccountsByUserId>>
): Promise<PublicOjAccount[]> => {
  const publicAccounts: PublicOjAccount[] = [];

  for (const account of accounts) {
    const publicAccount: PublicOjAccount = {
      handle: account.handle,
      platform: account.platform,
      profileUrl: account.profileUrl,
    };

    if (account.platform === "codeforces") {
      publicAccount.codeforces = await getCodeforcesStatsForProfile(
        db,
        account
      );
    }

    publicAccounts.push(publicAccount);
  }

  return publicAccounts;
};

const clearCodeforcesStatsIfNeeded = async (
  db: Context["db"],
  account: { id: string; platform: (typeof ojPlatforms)[number] }
) => {
  if (account.platform === "codeforces") {
    await deleteCodeforcesStats(db, account.id);
    await deleteCodeforcesAccountStatsRefreshJob(db, account.id);
  }
};

const enqueueCodeforcesStatsIfNeeded = async (
  db: Context["db"],
  account: { id: string; platform: (typeof ojPlatforms)[number] }
) => {
  if (account.platform === "codeforces") {
    await enqueueCodeforcesAccountStatsRefresh(db, account.id);
  }
};

const buildLuoguProfileUrl = async (handle: string) => {
  try {
    const response = await fetch(
      `https://www.luogu.com.cn/api/user/search?keyword=${encodeURIComponent(handle)}`,
      { signal: AbortSignal.timeout(2000) }
    );

    if (!response.ok) {
      return "";
    }

    const data: unknown = await response.json();

    if (typeof data !== "object" || data === null) {
      return "";
    }

    const users = Reflect.get(data, "users");

    if (!Array.isArray(users)) {
      return "";
    }

    const matchedUser = users.find((user: unknown) => {
      if (typeof user !== "object" || user === null) {
        return false;
      }

      return (
        Reflect.get(user, "name") === handle &&
        typeof Reflect.get(user, "uid") === "number"
      );
    });

    if (!matchedUser) {
      return "";
    }

    return `https://www.luogu.com.cn/user/${Reflect.get(matchedUser, "uid")}`;
  } catch {
    return "";
  }
};

const buildOjProfileUrl = async (
  platform: (typeof ojPlatforms)[number],
  handle: string
) => {
  const encodedHandle = encodeURIComponent(handle);

  if (platform === "codeforces") {
    return `https://codeforces.com/profile/${encodedHandle}`;
  }

  if (platform === "atcoder") {
    return `https://atcoder.jp/users/${encodedHandle}`;
  }

  if (platform === "luogu") {
    return await buildLuoguProfileUrl(handle);
  }

  // TODO: Fill in per-platform profile URL rules.
  return "";
};

const getExistingCurrentUserAccountMessage = (account: {
  handle: string;
  platform: string;
}) => `OJ account already exists: ${account.platform} ${account.handle}`;

const getCodeforcesRankStatus = (input: {
  fetchedAt: Date | null;
  hasActiveRefreshJob: boolean;
  lastError: null | string;
  statsHandle: null | string;
  now: Date;
}): CodeforcesRankStatus => {
  if (input.hasActiveRefreshJob) {
    return "refreshing";
  }

  if (!input.statsHandle) {
    return "empty";
  }

  if (input.lastError) {
    return "failed";
  }

  if (!input.fetchedAt) {
    return "empty";
  }

  const ageMs = input.now.getTime() - input.fetchedAt.getTime();

  if (ageMs >= refreshDefaults.codeforcesStatsTtlMs) {
    return "stale";
  }

  return "ready";
};

const getBunRuntime = () => {
  const candidate: unknown = Reflect.get(globalThis, "Bun");

  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  const version: unknown = Reflect.get(candidate, "version");

  if (typeof version !== "string") {
    return null;
  }

  return { version };
};

const getRuntimeName = () => {
  if (getBunRuntime()) {
    return "Bun";
  }

  return "Node.js";
};

const getRuntimeVersion = () => {
  const bunRuntime = getBunRuntime();

  if (bunRuntime) {
    return bunRuntime.version;
  }

  return process.version;
};

export const appRouter = router({
  health: publicProcedure.query(() => {
    const checkedAt = new Date();

    return {
      status: "ok",
      service: "hhuacm-dashboard API",
      checkedAt: checkedAt.toISOString(),
      uptimeMs: checkedAt.getTime() - serverStartedAt.getTime(),
      environment: process.env.NODE_ENV ?? "development",
      runtime: {
        name: getRuntimeName(),
        version: getRuntimeVersion(),
      },
      system: {
        platform: platform(),
        arch: arch(),
        release: release(),
      },
    };
  }),
  dashboard: router({
    summary: publicProcedure.query(async ({ ctx }) => {
      const [summary] = await ctx.db
        .select({
          activeUsers: sql<number | null>`
            sum(case when ${userProfile.memberStatus} = 'active' then 1 else 0 end)
          `.mapWith(Number),
          selectionUsers: sql<number | null>`
            sum(case when ${userProfile.memberStatus} is null or ${userProfile.memberStatus} = ${defaultMemberStatus} then 1 else 0 end)
          `.mapWith(Number),
          totalUsers: sql<number>`count(${user.id})`.mapWith(Number),
        })
        .from(user)
        .leftJoin(userProfile, eq(userProfile.userId, user.id));

      return {
        activeUsers: summary?.activeUsers ?? 0,
        selectionUsers: summary?.selectionUsers ?? 0,
        totalUsers: summary?.totalUsers ?? 0,
      };
    }),
  }),
  rank: router({
    codeforces: router({
      list: publicProcedure.query(async ({ ctx }) => {
        const rows = await ctx.db
          .select({
            acceptedProblemCount: codeforcesAccountStats.acceptedProblemCount,
            acceptedProblemCountInMonth:
              codeforcesAccountStats.acceptedProblemCountInMonth,
            accountId: userOjAccount.id,
            displayUsername: user.displayUsername,
            fetchedAt: codeforcesAccountStats.fetchedAt,
            grade: userProfile.grade,
            handle: userOjAccount.handle,
            lastError: codeforcesAccountStats.lastError,
            lastOnlineAt: codeforcesAccountStats.lastOnlineAt,
            major: userProfile.major,
            maxRating: codeforcesAccountStats.maxRating,
            profileUrl: userOjAccount.profileUrl,
            rating: codeforcesAccountStats.rating,
            realName: userProfile.realName,
            statsHandle: codeforcesAccountStats.handle,
            userId: user.id,
            username: user.username,
          })
          .from(user)
          .leftJoin(userProfile, eq(userProfile.userId, user.id))
          .leftJoin(
            userOjAccount,
            and(
              eq(userOjAccount.userId, user.id),
              eq(userOjAccount.platform, "codeforces")
            )
          )
          .leftJoin(
            codeforcesAccountStats,
            eq(codeforcesAccountStats.accountId, userOjAccount.id)
          )
          .orderBy(asc(usernameSortExpression), asc(user.id));
        const accountIds = rows.flatMap((row) =>
          row.accountId ? [row.accountId] : []
        );
        const activeRefreshJobs =
          accountIds.length > 0
            ? await ctx.db
                .select({ targetId: refreshJob.targetId })
                .from(refreshJob)
                .where(
                  and(
                    eq(refreshJob.kind, codeforcesAccountStatsJobKind),
                    eq(refreshJob.targetType, ojAccountTargetType),
                    inArray(refreshJob.targetId, accountIds)
                  )
                )
            : [];
        const refreshingAccountIds = new Set(
          activeRefreshJobs.map((job) => job.targetId)
        );
        const now = new Date();

        return rows.map((row) => ({
          codeforces: row.accountId
            ? {
                acceptedProblemCount: row.acceptedProblemCount,
                acceptedProblemCountInMonth: row.acceptedProblemCountInMonth,
                accountId: row.accountId,
                fetchedAt: toIsoString(row.fetchedAt),
                handle: row.handle ?? row.statsHandle ?? "",
                lastError: row.lastError,
                lastOnlineAt: toIsoString(row.lastOnlineAt),
                maxRating: row.maxRating,
                profileUrl: row.profileUrl ?? "",
                rating: row.rating,
                status: getCodeforcesRankStatus({
                  fetchedAt: row.fetchedAt,
                  hasActiveRefreshJob: refreshingAccountIds.has(row.accountId),
                  lastError: row.lastError,
                  now,
                  statsHandle: row.statsHandle,
                }),
              }
            : null,
          displayName:
            row.displayUsername ?? row.username ?? row.realName ?? "未命名用户",
          grade: row.grade,
          major: row.major,
          realName: row.realName,
          userId: row.userId,
          username: row.username,
        }));
      }),
    }),
  }),
  account: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const [currentUser] = await ctx.db
        .select({
          displayUsername: user.displayUsername,
          email: user.email,
          id: user.id,
          name: user.name,
          role: user.role,
          username: user.username,
        })
        .from(user)
        .where(eq(user.id, ctx.session.user.id))
        .limit(1);

      if (!currentUser) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return currentUser;
    }),
  }),
  admin: router({
    users: router({
      get: adminProcedure
        .input(adminUserInputSchema)
        .query(async ({ ctx, input }) => {
          const targetUser = await getTargetUser(ctx.db, input.userId);
          const [profile] = await ctx.db
            .select(profileFields)
            .from(userProfile)
            .where(eq(userProfile.userId, input.userId))
            .limit(1);
          const ojAccounts = await ctx.db
            .select(ojAccountFields)
            .from(userOjAccount)
            .where(eq(userOjAccount.userId, input.userId))
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
        }),
      list: adminProcedure
        .input(adminUsersListInputSchema)
        .query(async ({ ctx, input }) => {
          const offset = (input.page - 1) * input.pageSize;
          const filters = input.filters;
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
                ctx.db
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

          const whereCondition =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;
          const [totalRow] = await ctx.db
            .select({
              total: sql<number>`count(${user.id})`.mapWith(Number),
            })
            .from(user)
            .leftJoin(userProfile, eq(userProfile.userId, user.id))
            .where(whereCondition);

          const users = await ctx.db
            .select({
              displayUsername: user.displayUsername,
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
              ? await ctx.db
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
            const currentAccounts =
              ojAccountsByUserId.get(account.userId) ?? [];
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
        }),
      metadata: adminProcedure.query(async ({ ctx }) => {
        const gradeRows = await ctx.db
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
            label: adminMemberStatusLabels[status],
            value: status,
          })),
          ojPlatforms: ojPlatforms.map((platform) => ({
            label: adminOjPlatformLabels[platform],
            value: platform,
          })),
        };
      }),
      delete: adminProcedure
        .input(adminUserDeleteInputSchema)
        .mutation(async ({ ctx, input }) => {
          const targetUser = await getTargetUser(ctx.db, input.userId);

          if (targetUser.role === "admin") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Admin users cannot be deleted from the admin panel",
            });
          }

          const [targetProfile] = await ctx.db
            .select({ memberStatus: userProfile.memberStatus })
            .from(userProfile)
            .where(eq(userProfile.userId, input.userId))
            .limit(1);
          const targetMemberStatus =
            targetProfile?.memberStatus ?? defaultMemberStatus;

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
            ctx.db,
            input.userId
          );

          for (const account of targetOjAccounts) {
            await clearCodeforcesStatsIfNeeded(ctx.db, account);
          }

          const [deletedUser] = await ctx.db
            .delete(user)
            .where(eq(user.id, input.userId))
            .returning({
              displayUsername: user.displayUsername,
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
        }),
      updateProfile: adminProcedure
        .input(adminUserProfileUpdateInputSchema)
        .mutation(async ({ ctx, input }) => {
          await getTargetUser(ctx.db, input.userId);

          const [profile] = await ctx.db
            .insert(userProfile)
            .values({
              ...input.values,
              userId: input.userId,
            })
            .onConflictDoUpdate({
              set: {
                ...input.values,
                updatedAt: new Date(),
              },
              target: userProfile.userId,
            })
            .returning(profileFields);

          if (!profile) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }

          return {
            ...profile,
            memberStatus: profile.memberStatus ?? defaultMemberStatus,
          };
        }),
      upsertOjAccount: adminProcedure
        .input(adminUserOjAccountInputSchema)
        .mutation(async ({ ctx, input }) => {
          await getTargetUser(ctx.db, input.userId);

          const normalizedHandle = normalizeHandle(input.handle);
          const profileUrl = await buildOjProfileUrl(
            input.platform,
            input.handle
          );
          const [existingHandleOwner] = await ctx.db
            .select(ojAccountFields)
            .from(userOjAccount)
            .where(
              and(
                eq(userOjAccount.platform, input.platform),
                eq(userOjAccount.normalizedHandle, normalizedHandle),
                ne(userOjAccount.userId, input.userId)
              )
            )
            .limit(1);

          if (existingHandleOwner) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `OJ handle already exists: ${existingHandleOwner.platform} ${existingHandleOwner.handle}`,
            });
          }

          const [existingAccount] = await ctx.db
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
            const [account] = await ctx.db
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

            await clearCodeforcesStatsIfNeeded(ctx.db, account);
            await enqueueCodeforcesStatsIfNeeded(ctx.db, account);

            return {
              handle: account.handle,
              platform: account.platform,
              profileUrl: account.profileUrl,
            };
          }

          const [account] = await ctx.db
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

          await clearCodeforcesStatsIfNeeded(ctx.db, account);
          await enqueueCodeforcesStatsIfNeeded(ctx.db, account);

          return {
            handle: account.handle,
            platform: account.platform,
            profileUrl: account.profileUrl,
          };
        }),
      deleteOjAccount: adminProcedure
        .input(adminUserOjAccountDeleteInputSchema)
        .mutation(async ({ ctx, input }) => {
          await getTargetUser(ctx.db, input.userId);

          const [account] = await ctx.db
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

          await clearCodeforcesStatsIfNeeded(ctx.db, account);

          return {
            handle: account.handle,
            platform: account.platform,
            profileUrl: account.profileUrl,
          };
        }),
    }),
  }),
  profile: router({
    get: publicProcedure
      .input(profileGetInputSchema)
      .query(async ({ ctx, input }) => {
        const targetUser = await getTargetUserByUsername(
          ctx.db,
          input.username
        );
        const profile = await getProfileByUserId(ctx.db, targetUser.id);
        const ojAccounts = await attachPublicOjAccountData(
          ctx.db,
          await listInternalOjAccountsByUserId(ctx.db, targetUser.id)
        );
        const currentUserId = ctx.session?.user.id ?? null;
        const currentUser = currentUserId
          ? (
              await ctx.db
                .select({ role: user.role })
                .from(user)
                .where(eq(user.id, currentUserId))
                .limit(1)
            )[0]
          : null;

        return {
          ojAccounts,
          permissions: {
            isAdmin: currentUser?.role === "admin",
            isOwner: currentUserId === targetUser.id,
          },
          profile,
          user: {
            displayUsername: targetUser.displayUsername,
            email: targetUser.email,
            name: targetUser.name,
            username: targetUser.username,
          },
        };
      }),
  }),
  settings: router({
    profile: router({
      get: protectedProcedure.query(async ({ ctx }) => {
        const currentUser = await getTargetUser(ctx.db, ctx.session.user.id);
        const profile = await getProfileByUserId(ctx.db, currentUser.id);
        const ojAccounts = await listOjAccountsByUserId(ctx.db, currentUser.id);

        return {
          ojAccounts,
          profile,
          user: {
            displayUsername: currentUser.displayUsername,
            email: currentUser.email,
            name: currentUser.name,
            username: currentUser.username,
          },
        };
      }),
      update: protectedProcedure
        .input(profileUpdateInputSchema)
        .mutation(async ({ ctx, input }) => {
          await getTargetUser(ctx.db, ctx.session.user.id);

          const [profile] = await ctx.db
            .insert(userProfile)
            .values({
              ...input,
              userId: ctx.session.user.id,
            })
            .onConflictDoUpdate({
              set: {
                ...input,
                updatedAt: new Date(),
              },
              target: userProfile.userId,
            })
            .returning(profileFields);

          if (!profile) {
            throw new TRPCError({ code: "NOT_FOUND" });
          }

          return {
            ...profile,
            memberStatus: profile.memberStatus ?? defaultMemberStatus,
          };
        }),
    }),
    ojAccount: router({
      add: protectedProcedure
        .input(ojAccountInputSchema)
        .mutation(async ({ ctx, input }) => {
          const [existingCurrentUserAccount] = await ctx.db
            .select(ojAccountFields)
            .from(userOjAccount)
            .where(
              and(
                eq(userOjAccount.userId, ctx.session.user.id),
                eq(userOjAccount.platform, input.platform)
              )
            )
            .limit(1);

          if (existingCurrentUserAccount) {
            throw new TRPCError({
              code: "CONFLICT",
              message: getExistingCurrentUserAccountMessage(
                existingCurrentUserAccount
              ),
            });
          }

          const normalizedHandle = normalizeHandle(input.handle);
          const profileUrl = await buildOjProfileUrl(
            input.platform,
            input.handle
          );
          const [existingHandleOwner] = await ctx.db
            .select(ojAccountFields)
            .from(userOjAccount)
            .where(
              and(
                eq(userOjAccount.platform, input.platform),
                eq(userOjAccount.normalizedHandle, normalizedHandle)
              )
            )
            .limit(1);

          if (existingHandleOwner) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `OJ handle already exists: ${existingHandleOwner.platform} ${existingHandleOwner.handle}`,
            });
          }

          const [account] = await ctx.db
            .insert(userOjAccount)
            .values({
              handle: input.handle,
              normalizedHandle,
              platform: input.platform,
              profileUrl,
              userId: ctx.session.user.id,
            })
            .returning(internalOjAccountFields);

          if (!account) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          }

          await clearCodeforcesStatsIfNeeded(ctx.db, account);
          await enqueueCodeforcesStatsIfNeeded(ctx.db, account);

          return {
            handle: account.handle,
            platform: account.platform,
            profileUrl: account.profileUrl,
          };
        }),
      update: protectedProcedure
        .input(ojAccountInputSchema)
        .mutation(async ({ ctx, input }) => {
          const [existingCurrentUserAccount] = await ctx.db
            .select(ojAccountFields)
            .from(userOjAccount)
            .where(
              and(
                eq(userOjAccount.userId, ctx.session.user.id),
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

          const normalizedHandle = normalizeHandle(input.handle);
          const profileUrl = await buildOjProfileUrl(
            input.platform,
            input.handle
          );
          const [existingHandleOwner] = await ctx.db
            .select(ojAccountFields)
            .from(userOjAccount)
            .where(
              and(
                eq(userOjAccount.platform, input.platform),
                eq(userOjAccount.normalizedHandle, normalizedHandle),
                ne(userOjAccount.userId, ctx.session.user.id)
              )
            )
            .limit(1);

          if (existingHandleOwner) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `OJ handle already exists: ${existingHandleOwner.platform} ${existingHandleOwner.handle}`,
            });
          }

          const [account] = await ctx.db
            .update(userOjAccount)
            .set({
              handle: input.handle,
              normalizedHandle,
              profileUrl,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(userOjAccount.userId, ctx.session.user.id),
                eq(userOjAccount.platform, input.platform)
              )
            )
            .returning(internalOjAccountFields);

          if (!account) {
            throw new TRPCError({ code: "NOT_FOUND" });
          }

          await clearCodeforcesStatsIfNeeded(ctx.db, account);
          await enqueueCodeforcesStatsIfNeeded(ctx.db, account);

          return {
            handle: account.handle,
            platform: account.platform,
            profileUrl: account.profileUrl,
          };
        }),
      delete: protectedProcedure
        .input(ojAccountPlatformInputSchema)
        .mutation(async ({ ctx, input }) => {
          const [account] = await ctx.db
            .delete(userOjAccount)
            .where(
              and(
                eq(userOjAccount.userId, ctx.session.user.id),
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

          await clearCodeforcesStatsIfNeeded(ctx.db, account);

          return {
            handle: account.handle,
            platform: account.platform,
            profileUrl: account.profileUrl,
          };
        }),
    }),
  }),
});
export type AppRouter = typeof appRouter;
