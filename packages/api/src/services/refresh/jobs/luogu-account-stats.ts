import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { luoguAccountStats } from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { and, eq, isNull, lt, or } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  markLuoguAccountStatsRefreshFailed,
  syncLuoguAccountStats,
} from "../../luogu/sync";
import { refreshDefaults } from "../policy";
import type { RefreshRequestDefinition } from "../registry";
import { luoguAccountStatsRequestKind } from "../request-types";
import { requestLuoguAccountStatsRefresh } from "../requests";

type Database = Context["db"];

const luoguAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
  profileUrl: userOjAccount.profileUrl,
} as const;

const handleLuoguAccountStatsRequest = async (
  db: Database,
  request: Parameters<RefreshRequestDefinition["handle"]>[1]
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

const scanStaleLuoguAccountStatsTargets = async (db: Database, now: Date) => {
  const staleBefore = new Date(now.getTime() - refreshDefaults.luoguStatsTtlMs);
  const staleAccounts = await db
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
          lt(luoguAccountStats.fetchedAt, staleBefore)
        )
      )
    );

  for (const account of staleAccounts) {
    await requestLuoguAccountStatsRefresh(db, account.id);
  }

  return staleAccounts.length;
};

export const luoguAccountStatsRefreshRequestDefinition = {
  handle: handleLuoguAccountStatsRequest,
  kind: luoguAccountStatsRequestKind,
  scanStaleTargets: scanStaleLuoguAccountStatsTargets,
} as const satisfies RefreshRequestDefinition;
