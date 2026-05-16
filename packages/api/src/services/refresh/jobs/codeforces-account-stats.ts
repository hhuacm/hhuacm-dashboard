import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, isNull, lt, ne, or } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  markCodeforcesAccountStatsRefreshFailed,
  syncCodeforcesAccountStats,
} from "../../codeforces/sync";
import { codeforcesAccountStatsJobKind, refreshDefaults } from "../constants";
import { enqueueCodeforcesAccountStatsRefresh } from "../queue";
import type { RefreshJobDefinition } from "../runtime";

type Database = Context["db"];

const codeforcesAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const handleCodeforcesAccountStatsJob = async (
  db: Database,
  job: Parameters<RefreshJobDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select(codeforcesAccountFields)
    .from(userOjAccount)
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
