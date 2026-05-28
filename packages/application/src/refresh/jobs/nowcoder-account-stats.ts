import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { nowcoderAccountStats } from "@hhuacm-dashboard/db/schema/nowcoder-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  markNowcoderAccountStatsRefreshFailed,
  syncNowcoderAccountStats,
} from "../../services/nowcoder/sync";
import { refreshDefaults } from "../policy";
import { defineRefreshJob, type RefreshJobDefinition } from "./definition";

const nowcoderAccountFields = {
  externalId: userOjAccount.externalId,
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const handleNowcoderAccountStatsRequest = async (
  db: Database,
  request: Parameters<RefreshJobDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select(nowcoderAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.id, request.targetId),
        eq(userOjAccount.platform, "nowcoder")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Nowcoder account does not exist: ${request.targetId}`);
  }

  try {
    await syncNowcoderAccountStats(db, account);
  } catch (error) {
    await markNowcoderAccountStatsRefreshFailed(db, account, error);
  }
};

const enqueueDueNowcoderAccountStatsTargets = async (
  db: Database,
  now: Date
) => {
  const dueBefore = new Date(
    now.getTime() - refreshDefaults.nowcoderStatsTtlMs
  );
  const dueAccounts = await db
    .select(nowcoderAccountFields)
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      nowcoderAccountStats,
      eq(nowcoderAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "nowcoder"),
        or(
          isNull(nowcoderAccountStats.accountId),
          isNull(nowcoderAccountStats.fetchedAt),
          lt(nowcoderAccountStats.fetchedAt, dueBefore)
        )
      )
    );

  for (const account of dueAccounts) {
    await nowcoderAccountStatsJob.enqueue(db, account.id);
  }

  return dueAccounts.length;
};

export const nowcoderAccountStatsJob = defineRefreshJob({
  enqueueDueTargets: enqueueDueNowcoderAccountStatsTargets,
  handle: handleNowcoderAccountStatsRequest,
  kind: "nowcoder.accountStats",
});
