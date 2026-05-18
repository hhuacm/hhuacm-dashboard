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
import { codeforcesAccountStatsJobKind, refreshDefaults } from "../constants";
import { enqueueCodeforcesAccountStatsRefresh } from "../queue";
import type { RefreshJobDefinition } from "../runtime";

type Database = Context["db"];

const codeforcesAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const handleCodeforcesAccountStatsJob = async (
  db: Database,
  job: Parameters<RefreshJobDefinition["handle"]>[1]
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
        eq(userOjAccount.id, job.targetId),
        eq(userOjAccount.platform, "codeforces")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Codeforces account does not exist: ${job.targetId}`);
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

const scanStaleCodeforcesAccountStatsTargets = async (db: Database) => {
  const staleBefore = new Date(
    Date.now() - refreshDefaults.codeforcesStatsTtlMs
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
    await enqueueCodeforcesAccountStatsRefresh(db, account.id);
  }

  return staleAccounts.length;
};

export const codeforcesAccountStatsRefreshJobDefinition = {
  cooldownMs: refreshDefaults.jobCooldownMs,
  handle: handleCodeforcesAccountStatsJob,
  kind: codeforcesAccountStatsJobKind,
  scanStaleTargets: scanStaleCodeforcesAccountStatsTargets,
} as const satisfies RefreshJobDefinition;
