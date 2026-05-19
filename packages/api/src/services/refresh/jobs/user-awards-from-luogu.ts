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
import { refreshDefaults, userAwardsFromLuoguJobKind } from "../constants";
import { enqueueUserAwardsFromLuoguRefresh } from "../queue";
import type { RefreshJobDefinition } from "../runtime";

type Database = Context["db"];

const userAwardSource = "luogu";

const luoguAccountFields = {
  handle: userOjAccount.handle,
  id: userOjAccount.id,
  profileUrl: userOjAccount.profileUrl,
  userId: userOjAccount.userId,
} as const;

const memberStatusExpression = sql<MemberStatus>`coalesce(${userProfile.memberStatus}, ${defaultMemberStatus})`;

const handleUserAwardsFromLuoguJob = async (
  db: Database,
  job: Parameters<RefreshJobDefinition["handle"]>[1]
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
        eq(userOjAccount.id, job.targetId),
        eq(userOjAccount.platform, "luogu")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error(`Luogu account does not exist: ${job.targetId}`);
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

const scanStaleUserAwardsFromLuoguTargets = async (db: Database) => {
  const staleBefore = new Date(Date.now() - refreshDefaults.userAwardsTtlMs);
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
    await enqueueUserAwardsFromLuoguRefresh(db, account.id);
  }

  return staleAccounts.length;
};

export const userAwardsFromLuoguRefreshJobDefinition = {
  cooldownMs: refreshDefaults.jobCooldownMs,
  handle: handleUserAwardsFromLuoguJob,
  kind: userAwardsFromLuoguJobKind,
  scanStaleTargets: scanStaleUserAwardsFromLuoguTargets,
} as const satisfies RefreshJobDefinition;
