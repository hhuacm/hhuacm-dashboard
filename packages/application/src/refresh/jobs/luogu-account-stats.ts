import type { Database } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  markLuoguAccountStatsRefreshFailed,
  syncLuoguAccountStats,
} from "../../services/luogu/sync";
import { refreshDefaults } from "../policy";
import { createAccountStatsRefreshHandler } from "./account-stats-handler";
import { defineRefreshJob } from "./definition";

const enqueueDueLuoguAccountStatsTargets = async (db: Database, now: Date) => {
  const dueBefore = new Date(now.getTime() - refreshDefaults.luoguStatsTtlMs);
  const dueAccounts = await db
    .select({ id: userOjAccount.id })
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      luoguAccountStats,
      eq(luoguAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "luogu"),
        or(
          isNull(luoguAccountStats.accountId),
          isNull(luoguAccountStats.fetchedAt),
          lt(luoguAccountStats.fetchedAt, dueBefore)
        )
      )
    );

  for (const account of dueAccounts) {
    await luoguAccountStatsJob.enqueue(db, account.id);
  }

  return dueAccounts.length;
};

export const luoguAccountStatsJob = defineRefreshJob({
  enqueueDueTargets: enqueueDueLuoguAccountStatsTargets,
  handle: createAccountStatsRefreshHandler({
    markFailed: markLuoguAccountStatsRefreshFailed,
    platform: "luogu",
    sync: syncLuoguAccountStats,
  }),
  kind: "luogu.accountStats",
});
