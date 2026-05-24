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
    await requestLuoguAccountStatsRefresh(db, account.id);
  }

  return dueAccounts.length;
};

export const luoguAccountStatsRefreshRequestDefinition = {
  enqueueDueTargets: enqueueDueLuoguAccountStatsTargets,
  handle: handleLuoguAccountStatsRequest,
  kind: luoguAccountStatsRequestKind,
} as const satisfies RefreshRequestDefinition;
