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
import { defineRefreshJob, type RefreshJobDefinition } from "./definition";

const luoguAccountFields = {
  externalId: userOjAccount.externalId,
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const handleLuoguAccountStatsRequest = async (
  db: Database,
  request: Parameters<RefreshJobDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select(luoguAccountFields)
    .from(userOjAccount)
    .where(
      and(
        eq(userOjAccount.id, request.targetId),
        eq(userOjAccount.platform, "luogu")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Luogu account does not exist: ${request.targetId}`);
  }

  try {
    await syncLuoguAccountStats(db, account);
  } catch (error) {
    await markLuoguAccountStatsRefreshFailed(db, account, error);
  }
};

const enqueueDueLuoguAccountStatsTargets = async (db: Database, now: Date) => {
  const dueBefore = new Date(now.getTime() - refreshDefaults.luoguStatsTtlMs);
  const dueAccounts = await db
    .select(luoguAccountFields)
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
  handle: handleLuoguAccountStatsRequest,
  kind: "luogu.accountStats",
});
