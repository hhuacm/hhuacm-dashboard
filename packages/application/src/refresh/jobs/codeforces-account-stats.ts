import type { Database } from "@hhuacm-dashboard/db";
import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  markCodeforcesAccountStatsRefreshFailed,
  syncCodeforcesAccountStats,
} from "../../services/codeforces/sync";
import { refreshDefaults } from "../policy";
import { defineRefreshJob, type RefreshJobDefinition } from "./definition";

const codeforcesAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const handleCodeforcesAccountStatsRequest = async (
  db: Database,
  request: Parameters<RefreshJobDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select(codeforcesAccountFields)
    .from(userOjAccount)
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

  try {
    await syncCodeforcesAccountStats(db, account);
  } catch (error) {
    await markCodeforcesAccountStatsRefreshFailed(db, account, error);
  }
};

const enqueueDueCodeforcesAccountStatsTargets = async (
  db: Database,
  now: Date
) => {
  const dueBefore = new Date(
    now.getTime() - refreshDefaults.codeforcesStatsTtlMs
  );
  const dueAccounts = await db
    .select(codeforcesAccountFields)
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      codeforcesAccountStats,
      eq(codeforcesAccountStats.accountId, userOjAccount.id)
    )
    .where(
      and(
        eq(userOjAccount.platform, "codeforces"),
        or(
          isNull(codeforcesAccountStats.accountId),
          isNull(codeforcesAccountStats.fetchedAt),
          lt(codeforcesAccountStats.fetchedAt, dueBefore)
        )
      )
    );

  for (const account of dueAccounts) {
    await codeforcesAccountStatsJob.enqueue(db, account.id);
  }

  return dueAccounts.length;
};

export const codeforcesAccountStatsJob = defineRefreshJob({
  enqueueDueTargets: enqueueDueCodeforcesAccountStatsTargets,
  handle: handleCodeforcesAccountStatsRequest,
  kind: "codeforces.accountStats",
});
