import type { OjPlatform } from "@hhuacm-dashboard/domain";

import type { Context } from "../../context";
import { createRefreshRequest, deleteRefreshRequest } from "./request-store";
import {
  codeforcesAccountStatsRequestKind,
  luoguAccountStatsRequestKind,
  luoguProblemDetailsRequestKind,
  luoguProfileUrlRequestKind,
  userAwardsFromLuoguRequestKind,
} from "./request-types";

type Database = Context["db"];

export interface OjAccountRefreshTarget {
  id: string;
  platform: OjPlatform;
}

export const requestCodeforcesAccountStatsRefresh = async (
  db: Database,
  accountId: string
) => {
  await createRefreshRequest(db, {
    kind: codeforcesAccountStatsRequestKind,
    targetId: accountId,
  });
};

export const requestLuoguAccountStatsRefresh = async (
  db: Database,
  accountId: string
) => {
  await createRefreshRequest(db, {
    kind: luoguAccountStatsRequestKind,
    targetId: accountId,
  });
};

export const requestLuoguProfileUrlRefresh = async (
  db: Database,
  accountId: string
) => {
  await createRefreshRequest(db, {
    kind: luoguProfileUrlRequestKind,
    targetId: accountId,
  });
};

const requestLuoguProblemDetailsRefresh = async (db: Database, pid: string) => {
  await createRefreshRequest(db, {
    kind: luoguProblemDetailsRequestKind,
    targetId: pid,
  });
};

export const requestLuoguProblemDetailsRefreshes = async (
  db: Database,
  pids: string[]
) => {
  for (const pid of new Set(pids)) {
    await requestLuoguProblemDetailsRefresh(db, pid);
  }
};

export const requestUserAwardsFromLuoguRefresh = async (
  db: Database,
  accountId: string
) => {
  await createRefreshRequest(db, {
    kind: userAwardsFromLuoguRequestKind,
    targetId: accountId,
  });
};

const clearCodeforcesAccountStatsRefreshRequest = (
  db: Database,
  accountId: string
) =>
  deleteRefreshRequest(db, {
    kind: codeforcesAccountStatsRequestKind,
    targetId: accountId,
  });

const clearLuoguAccountStatsRefreshRequest = (
  db: Database,
  accountId: string
) =>
  deleteRefreshRequest(db, {
    kind: luoguAccountStatsRequestKind,
    targetId: accountId,
  });

const clearUserAwardsFromLuoguRefreshRequest = (
  db: Database,
  accountId: string
) =>
  deleteRefreshRequest(db, {
    kind: userAwardsFromLuoguRequestKind,
    targetId: accountId,
  });

export const requestOjAccountRefresh = async (
  db: Database,
  account: OjAccountRefreshTarget
) => {
  if (account.platform === "codeforces") {
    await requestCodeforcesAccountStatsRefresh(db, account.id);
    return;
  }

  if (account.platform === "luogu") {
    await requestLuoguAccountStatsRefresh(db, account.id);
    await requestUserAwardsFromLuoguRefresh(db, account.id);
  }
};

export const clearOjAccountRefresh = async (
  db: Database,
  account: OjAccountRefreshTarget
) => {
  if (account.platform === "codeforces") {
    await clearCodeforcesAccountStatsRefreshRequest(db, account.id);
    return;
  }

  if (account.platform === "luogu") {
    await clearLuoguAccountStatsRefreshRequest(db, account.id);
    await clearUserAwardsFromLuoguRefreshRequest(db, account.id);
  }
};
