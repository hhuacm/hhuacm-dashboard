import { user } from "@hhuacm-dashboard/db/schema/auth";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { and, eq, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  markCodeforcesAccountStatsRefreshFailed,
  syncCodeforcesAccountStats,
} from "../../codeforces/sync";
import {
  isPublicActivityMemberStatus,
  publicActivityMemberStatuses,
} from "../../member-status";
import { refreshDefaults } from "../policy";
import type { RefreshRequestDefinition } from "../registry";
import { codeforcesAccountStatsRequestKind } from "../request-types";
import { requestCodeforcesAccountStatsRefresh } from "../requests";

type Database = Context["db"];

const codeforcesAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const handleCodeforcesAccountStatsRequest = async (
  db: Database,
  request: Parameters<RefreshRequestDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select({
      ...codeforcesAccountFields,
      memberStatus: memberStatusExpression,
    })
    .from(userOjAccount)
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(
      and(
        eq(userOjAccount.id, request.targetId),
        eq(userOjAccount.platform, "codeforces")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Codeforces account does not exist: ${request.targetId}`);
  }

  if (!isPublicActivityMemberStatus(account.memberStatus)) {
    return;
  }

  try {
    await syncCodeforcesAccountStats(db, account);
  } catch (error) {
    await markCodeforcesAccountStatsRefreshFailed(db, account, error);
  }
};

const scanStaleCodeforcesAccountStatsTargets = async (
  db: Database,
  now: Date
) => {
  const staleBefore = new Date(
    now.getTime() - refreshDefaults.codeforcesStatsTtlMs
  );
  const staleAccounts = await db
    .select(codeforcesAccountFields)
    .from(userOjAccount)
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(
      codeforcesAccountStats,
      eq(codeforcesAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "codeforces"),
        inArray(memberStatusExpression, publicActivityMemberStatuses),
        or(
          isNull(codeforcesAccountStats.accountId),
          isNull(codeforcesAccountStats.fetchedAt),
          lt(codeforcesAccountStats.fetchedAt, staleBefore),
          ne(codeforcesAccountStats.handle, userOjAccount.handle)
        )
      )
    );

  for (const account of staleAccounts) {
    await requestCodeforcesAccountStatsRefresh(db, account.id);
  }

  return staleAccounts.length;
};

export const codeforcesAccountStatsRefreshRequestDefinition = {
  handle: handleCodeforcesAccountStatsRequest,
  kind: codeforcesAccountStatsRequestKind,
  scanStaleTargets: scanStaleCodeforcesAccountStatsTargets,
} as const satisfies RefreshRequestDefinition;
