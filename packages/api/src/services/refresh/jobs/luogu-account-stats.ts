import { user } from "@hhuacm-dashboard/db/schema/auth";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  markLuoguAccountStatsRefreshFailed,
  syncLuoguAccountStats,
} from "../../luogu/sync";
import {
  isPublicActivityMemberStatus,
  publicActivityMemberStatuses,
} from "../../member-status";
import { luoguAccountStatsJobKind, refreshDefaults } from "../constants";
import { enqueueLuoguAccountStatsRefresh } from "../queue";
import type { RefreshJobDefinition } from "../runtime";

type Database = Context["db"];

const luoguAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
  profileUrl: userOjAccount.profileUrl,
} as const;

const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const handleLuoguAccountStatsJob = async (
  db: Database,
  job: Parameters<RefreshJobDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select({
      ...luoguAccountFields,
      memberStatus: memberStatusExpression,
    })
    .from(userOjAccount)
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(
      and(
        eq(userOjAccount.id, job.targetId),
        eq(userOjAccount.platform, "luogu")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Luogu account does not exist: ${job.targetId}`);
  }

  if (!isPublicActivityMemberStatus(account.memberStatus)) {
    return;
  }

  try {
    await syncLuoguAccountStats(db, account);
  } catch (error) {
    await markLuoguAccountStatsRefreshFailed(db, account, error);
  }
};

const scanStaleLuoguAccountStatsTargets = async (db: Database) => {
  const staleBefore = new Date(Date.now() - refreshDefaults.luoguStatsTtlMs);
  const staleAccounts = await db
    .select(luoguAccountFields)
    .from(userOjAccount)
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(
      luoguAccountStats,
      eq(luoguAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "luogu"),
        inArray(memberStatusExpression, publicActivityMemberStatuses),
        or(
          isNull(luoguAccountStats.accountId),
          isNull(luoguAccountStats.fetchedAt),
          lt(luoguAccountStats.fetchedAt, staleBefore)
        )
      )
    );

  for (const account of staleAccounts) {
    await enqueueLuoguAccountStatsRefresh(db, account.id);
  }

  return staleAccounts.length;
};

export const luoguAccountStatsRefreshJobDefinition = {
  cooldownMs: refreshDefaults.jobCooldownMs,
  handle: handleLuoguAccountStatsJob,
  kind: luoguAccountStatsJobKind,
  scanStaleTargets: scanStaleLuoguAccountStatsTargets,
} as const satisfies RefreshJobDefinition;
