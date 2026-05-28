import type { Database } from "@hhuacm-dashboard/db";
import { atcoderAccountStats } from "@hhuacm-dashboard/db/schema/atcoder-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  markAtcoderAccountStatsRefreshFailed,
  syncAtcoderAccountStats,
} from "../../services/atcoder/sync";
import { refreshDefaults } from "../policy";
import { defineRefreshJob, type RefreshJobDefinition } from "./definition";

const atcoderAccountFields = {
  externalId: userOjAccount.externalId,
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const handleAtcoderAccountStatsRequest = async (
  db: Database,
  request: Parameters<RefreshJobDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select(atcoderAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.id, request.targetId),
        eq(userOjAccount.platform, "atcoder")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`AtCoder account does not exist: ${request.targetId}`);
  }

  try {
    await syncAtcoderAccountStats(db, account);
  } catch (error) {
    await markAtcoderAccountStatsRefreshFailed(db, account, error);
  }
};

const enqueueDueAtcoderAccountStatsTargets = async (
  db: Database,
  now: Date
) => {
  const dueBefore = new Date(now.getTime() - refreshDefaults.atcoderStatsTtlMs);
  const dueAccounts = await db
    .select(atcoderAccountFields)
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      atcoderAccountStats,
      eq(atcoderAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "atcoder"),
        or(
          isNull(atcoderAccountStats.accountId),
          isNull(atcoderAccountStats.fetchedAt),
          lt(atcoderAccountStats.fetchedAt, dueBefore)
        )
      )
    );

  for (const account of dueAccounts) {
    await atcoderAccountStatsJob.enqueue(db, account.id);
  }

  return dueAccounts.length;
};

export const atcoderAccountStatsJob = defineRefreshJob({
  enqueueDueTargets: enqueueDueAtcoderAccountStatsTargets,
  handle: handleAtcoderAccountStatsRequest,
  kind: "atcoder.accountStats",
});
