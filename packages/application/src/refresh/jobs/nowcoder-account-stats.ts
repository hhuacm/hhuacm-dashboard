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
import { createAccountStatsRefreshHandler } from "./account-stats-handler";
import { defineRefreshJob } from "./definition";

const enqueueDueNowcoderAccountStatsTargets = async (
  db: Database,
  now: Date
) => {
  const dueBefore = new Date(
    now.getTime() - refreshDefaults.nowcoderStatsTtlMs
  );
  const dueAccounts = await db
    .select({ id: userOjAccount.id })
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
  handle: createAccountStatsRefreshHandler({
    markFailed: markNowcoderAccountStatsRefreshFailed,
    platform: "nowcoder",
    sync: syncNowcoderAccountStats,
  }),
  kind: "nowcoder.accountStats",
});
