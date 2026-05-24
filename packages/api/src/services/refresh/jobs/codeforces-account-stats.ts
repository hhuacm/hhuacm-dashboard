import { codeforcesAccountStats } from "@hhuacm-dashboard/db/schema/codeforces-account-stats";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, isNull, lt, or } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  markCodeforcesAccountStatsRefreshFailed,
  syncCodeforcesAccountStats,
} from "../../codeforces/sync";
import { refreshDefaults } from "../policy";
import type { RefreshRequestDefinition } from "../registry";
import { codeforcesAccountStatsRequestKind } from "../request-types";
import { requestCodeforcesAccountStatsRefresh } from "../requests";

type Database = Context["db"];

const codeforcesAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
} as const;

const handleCodeforcesAccountStatsRequest = async (
  db: Database,
  request: Parameters<RefreshRequestDefinition["handle"]>[1]
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

const scanStaleCodeforcesAccountStatsTargets = async (
  db: Database,
  now: Date
) => {
  const staleBefore = new Date(
    now.getTime() - refreshDefaults.codeforcesStatsTtlMs
  );
  const staleAccounts = await db
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
          lt(codeforcesAccountStats.fetchedAt, staleBefore)
        )
      )
    );

  for (const account of staleAccounts) {
    await requestCodeforcesAccountStatsRefresh(db, account.id);
  }

  return staleAccounts.length;
};

export const codeforcesAccountStatsRefreshRequestDefinition = {
  handle: handleCodeforcesAccountStatsRequest,
  kind: codeforcesAccountStatsRequestKind,
  scanStaleTargets: scanStaleCodeforcesAccountStatsTargets,
} as const satisfies RefreshRequestDefinition;
