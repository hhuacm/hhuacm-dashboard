import { user } from "@hhuacm-dashboard/db/schema/auth";
import { userOjAccount } from "@hhuacm-dashboard/db/schema/oj-account";
import { userProfile } from "@hhuacm-dashboard/db/schema/profile";
import { userAwardSync } from "@hhuacm-dashboard/db/schema/user-award";
import {
  defaultMemberStatus,
  type MemberStatus,
} from "@hhuacm-dashboard/domain";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";

import type { Context } from "../../../context";
import {
  isPublicActivityMemberStatus,
  publicActivityMemberStatuses,
} from "../../member-status";
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

const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const handleUserAwardsFromLuoguRequest = async (
  db: Database,
  request: Parameters<RefreshRequestDefinition["handle"]>[1]
) => {
  const [account] = await db
    .select({
      ...luoguAccountFields,
      memberStatus: memberStatusExpression,
    })
    .from(userOjAccount)
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
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

  if (!isPublicActivityMemberStatus(account.memberStatus)) {
    return;
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
    .innerJoin(user, eq(user.id, userOjAccount.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
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
        inArray(memberStatusExpression, publicActivityMemberStatuses),
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
