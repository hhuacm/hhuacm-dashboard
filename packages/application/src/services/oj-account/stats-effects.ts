import type { Database, DatabaseTransaction } from "@hhuacm-dashboard/db";
import { currentMember } from "@hhuacm-dashboard/db/schema/current-member";
import type { OjPlatform } from "@hhuacm-dashboard/domain";
import { eq } from "drizzle-orm";
import { accountStatsRefreshKindByPlatform } from "../../refresh/account-stats";
import {
  deleteRefreshRequest,
  enqueueRefreshRequest,
  type RefreshQueueDatabase,
  type RefreshRequestKind,
} from "../../refresh/request-store";
import { userAwardsFromLuoguRefreshKind } from "../../refresh/user-awards";
import { deleteAtcoderStats } from "../atcoder/sync";
import { deleteCodeforcesStats } from "../codeforces/stats-cache";
import { deleteLuoguStats } from "../luogu/sync";
import { deleteNowcoderStats } from "../nowcoder/sync";
import { deleteLuoguUserAwards } from "../profile-awards";
import { listInternalOjAccountsByUserId } from "./queries";

export interface AccountStatsEffectTarget {
  id: string;
  platform: OjPlatform;
}

type AccountStatsEffect = (
  db: Database | DatabaseTransaction,
  accountId: string
) => Promise<void>;

interface AccountStatsEffects {
  clearStats: AccountStatsEffect;
  refreshKinds: readonly RefreshRequestKind[];
}

const accountStatsEffects = {
  atcoder: {
    clearStats: deleteAtcoderStats,
    refreshKinds: [accountStatsRefreshKindByPlatform.atcoder],
  },
  codeforces: {
    clearStats: deleteCodeforcesStats,
    refreshKinds: [accountStatsRefreshKindByPlatform.codeforces],
  },
  luogu: {
    clearStats: deleteLuoguStats,
    refreshKinds: [
      accountStatsRefreshKindByPlatform.luogu,
      userAwardsFromLuoguRefreshKind,
    ],
  },
  nowcoder: {
    clearStats: deleteNowcoderStats,
    refreshKinds: [accountStatsRefreshKindByPlatform.nowcoder],
  },
} satisfies Record<OjPlatform, AccountStatsEffects>;

const clearOjAccountRefreshRequests = async (
  db: RefreshQueueDatabase,
  account: AccountStatsEffectTarget
) => {
  for (const kind of accountStatsEffects[account.platform].refreshKinds) {
    await deleteRefreshRequest(db, {
      kind,
      targetId: account.id,
    });
  }
};

export const resetOjAccountStatsEffects = async (
  db: Database | DatabaseTransaction,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  await accountStatsEffects[account.platform].clearStats(db, account.id);

  if (account.platform === "luogu") {
    await deleteLuoguUserAwards(db, userId);
  }

  await clearOjAccountRefreshRequests(db, account);
};

export const clearOjAccountRefreshRequestsForUser = async (
  db: Database | DatabaseTransaction,
  userId: string
) => {
  const accounts = await listInternalOjAccountsByUserId(db, userId);

  for (const account of accounts) {
    await clearOjAccountRefreshRequests(db, account);
  }
};

const isCurrentMember = async (db: RefreshQueueDatabase, userId: string) => {
  const [currentMemberRow] = await db
    .select({ userId: currentMember.userId })
    .from(currentMember)
    .where(eq(currentMember.userId, userId))
    .limit(1);

  return Boolean(currentMemberRow);
};

export const requestOjAccountRefreshEffectsIfNeeded = async (
  db: RefreshQueueDatabase,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  if (!(await isCurrentMember(db, userId))) {
    return;
  }

  for (const kind of accountStatsEffects[account.platform].refreshKinds) {
    await enqueueRefreshRequest(db, {
      kind,
      targetId: account.id,
    });
  }
};

export const replaceOjAccountStatsEffectsIfNeeded = async (
  db: Database | DatabaseTransaction,
  account: AccountStatsEffectTarget,
  userId: string
) => {
  await resetOjAccountStatsEffects(db, account, userId);
  await requestOjAccountRefreshEffectsIfNeeded(db, account, userId);
};
