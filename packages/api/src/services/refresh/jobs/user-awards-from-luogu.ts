import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userAwardSync } from "@hhuacm-dashboard/db/schema/user-award";
import { and, eq, isNull, lt, or } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  markUserAwardsFromLuoguRefreshFailed,
  syncUserAwardsFromLuogu,
} from "../../profile-awards";
import { refreshDefaults } from "../policy";
import type { RefreshRequestDefinition } from "../registry";
import { userAwardsFromLuoguRequestKind } from "../request-types";
import { requestUserAwardsFromLuoguRefresh } from "../requests";

type Database = Context["db"];

const userAwardSource = "luogu";

const luoguAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
  profileUrl: userOjAccount.profileUrl,
  userId: userOjAccount.userId,
} as const;

const handleUserAwardsFromLuoguRequest = async (
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
    await syncUserAwardsFromLuogu(db, account);
  } catch (error) {
    await markUserAwardsFromLuoguRefreshFailed(db, account, error);
  }
};

const scanStaleUserAwardsFromLuoguTargets = async (db: Database, now: Date) => {
  const staleBefore = new Date(now.getTime() - refreshDefaults.userAwardsTtlMs);
  const staleAccounts = await db
    .select(luoguAccountFields)
    .from(userOjAccount)
    .innerJoin(currentMember, eq(currentMember.userId, userOjAccount.userId))
    .leftJoin(
      userAwardSync,
      and(
        eq(userAwardSync.userId, userOjAccount.userId),
        eq(userAwardSync.source, userAwardSource)
      )
    )
    .where(
      and(
        eq(userOjAccount.platform, "luogu"),
        or(
          isNull(userAwardSync.userId),
          isNull(userAwardSync.fetchedAt),
          lt(userAwardSync.fetchedAt, staleBefore)
        )
      )
    );

  for (const account of staleAccounts) {
    await requestUserAwardsFromLuoguRefresh(db, account.id);
  }

  return staleAccounts.length;
};

export const userAwardsFromLuoguRefreshRequestDefinition = {
  handle: handleUserAwardsFromLuoguRequest,
  kind: userAwardsFromLuoguRequestKind,
  scanStaleTargets: scanStaleUserAwardsFromLuoguTargets,
} as const satisfies RefreshRequestDefinition;
