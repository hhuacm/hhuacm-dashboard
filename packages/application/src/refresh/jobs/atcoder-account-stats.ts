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
import { createAccountStatsRefreshHandler } from "./account-stats-handler";
import { defineRefreshJob } from "./definition";

const enqueueDueAtcoderAccountStatsTargets = async (
  db: Database,
  now: Date
) => {
  const dueBefore = new Date(now.getTime() - refreshDefaults.atcoderStatsTtlMs);
  const dueAccounts = await db
    .select({ id: userOjAccount.id })
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
  handle: createAccountStatsRefreshHandler({
    markFailed: markAtcoderAccountStatsRefreshFailed,
    platform: "atcoder",
    sync: syncAtcoderAccountStats,
  }),
  kind: "atcoder.accountStats",
});
