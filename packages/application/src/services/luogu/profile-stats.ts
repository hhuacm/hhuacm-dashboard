import type { Database } from "@hhuacm-dashboard/db";
import {
  luoguAcceptedProblem,
  luoguAccountStats,
} from "@hhuacm-dashboard/db/schema/luogu-account-stats";
import { eq } from "drizzle-orm";
import { ensureLuoguAccountStatsRefresh } from "../../refresh/ensure";
import {
  getRefreshSyncStatus,
  type RefreshSyncStatus,
} from "../../refresh/sync-status";
import type { LuoguAccount } from "./types";

interface PublicLuoguDifficultyCount {
  count: number;
  difficulty: number;
  label: string;
}

export interface PublicLuoguStats {
  acceptedProblemCount: null | number;
  acceptedWeightedScore: null | number;
  averageAcceptedDifficulty: null | number;
  difficultyCounts: PublicLuoguDifficultyCount[];
  fetchedAt: null | string;
  syncStatus: RefreshSyncStatus;
}

interface LuoguPracticeSummaryInput {
  passed: { difficulty: null | number }[];
  passedProblemCount?: null | number;
}

const luoguProfilePathRegex = /^\/user\/(\d+)\/?$/;

export const luoguDifficultyLabels = [
  "暂无评定",
  "入门",
  "普及-",
  "普及/提高-",
  "普及+/提高",
  "提高+/省选-",
  "省选/NOI-",
  "NOI/NOI+/CTSC",
] as const;

export const parseLuoguUidFromProfileUrl = (profileUrl: string) => {
  if (!profileUrl) {
    return null;
  }

  try {
    const url = new URL(profileUrl);
    const match = luoguProfilePathRegex.exec(url.pathname);
    const uid = match?.[1] ? Number(match[1]) : null;

    return uid === null || Number.isSafeInteger(uid) ? uid : null;
  } catch {
    return null;
  }
};

export const summarizeLuoguPractice = (
  input: LuoguPracticeSummaryInput
): Pick<
  PublicLuoguStats,
  | "acceptedProblemCount"
  | "acceptedWeightedScore"
  | "averageAcceptedDifficulty"
  | "difficultyCounts"
> => {
  const counts = new Map<number, number>();
  let acceptedWeightedScore = 0;
  let difficultySum = 0;
  let difficultyCount = 0;

  for (const problem of input.passed) {
    acceptedWeightedScore += problem.difficulty ?? 0;

    if (problem.difficulty === null) {
      continue;
    }

    counts.set(problem.difficulty, (counts.get(problem.difficulty) ?? 0) + 1);
    difficultySum += problem.difficulty;
    difficultyCount += 1;
  }

  return {
    acceptedProblemCount: input.passedProblemCount ?? input.passed.length,
    acceptedWeightedScore,
    averageAcceptedDifficulty:
      difficultyCount === 0 ? null : difficultySum / difficultyCount,
    difficultyCounts: luoguDifficultyLabels.map((label, difficulty) => ({
      count: counts.get(difficulty) ?? 0,
      difficulty,
      label,
    })),
  };
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const getLuoguStats = async (db: Database, accountId: string) =>
  (
    await db
      .select({
        acceptedProblemCount: luoguAccountStats.acceptedProblemCount,
        acceptedWeightedScore: luoguAccountStats.acceptedWeightedScore,
        averageAcceptedDifficulty: luoguAccountStats.averageAcceptedDifficulty,
        fetchedAt: luoguAccountStats.fetchedAt,
        lastAttemptedAt: luoguAccountStats.lastAttemptedAt,
        lastError: luoguAccountStats.lastError,
      })
      .from(luoguAccountStats)
      .where(eq(luoguAccountStats.accountId, accountId))
      .limit(1)
  )[0] ?? null;

const getLuoguAcceptedProblems = async (db: Database, accountId: string) =>
  await db
    .select({
      difficulty: luoguAcceptedProblem.difficulty,
    })
    .from(luoguAcceptedProblem)
    .where(eq(luoguAcceptedProblem.accountId, accountId));

export const getLuoguStatsForProfile = async (
  db: Database,
  account: LuoguAccount
): Promise<PublicLuoguStats | null> => {
  const uid = parseLuoguUidFromProfileUrl(account.profileUrl);
  const emptyDifficultyCounts = summarizeLuoguPractice({
    passed: [],
  }).difficultyCounts;

  if (uid === null) {
    return {
      acceptedProblemCount: null,
      acceptedWeightedScore: null,
      averageAcceptedDifficulty: null,
      difficultyCounts: emptyDifficultyCounts,
      fetchedAt: null,
      syncStatus: "empty",
    };
  }

  const now = new Date();
  const currentStats = await getLuoguStats(db, account.id);
  const refreshQueueState = await ensureLuoguAccountStatsRefresh(db, {
    accountId: account.id,
    fetchedAt: currentStats?.fetchedAt ?? null,
    now,
  });
  const syncStatus = getRefreshSyncStatus({
    fetchedAt: currentStats?.fetchedAt ?? null,
    isQueued: refreshQueueState.isQueued,
    lastError: currentStats?.lastError ?? null,
  });

  if (!currentStats?.fetchedAt) {
    return {
      acceptedProblemCount: null,
      acceptedWeightedScore: null,
      averageAcceptedDifficulty: null,
      difficultyCounts: emptyDifficultyCounts,
      fetchedAt: null,
      syncStatus,
    };
  }

  const acceptedProblems = await getLuoguAcceptedProblems(db, account.id);
  const summary = summarizeLuoguPractice({
    passed: acceptedProblems,
    passedProblemCount: currentStats.acceptedProblemCount,
  });

  return {
    acceptedProblemCount: currentStats.acceptedProblemCount,
    acceptedWeightedScore: currentStats.acceptedWeightedScore,
    averageAcceptedDifficulty: currentStats.averageAcceptedDifficulty,
    difficultyCounts: summary.difficultyCounts,
    fetchedAt: toIsoString(currentStats.fetchedAt),
    syncStatus,
  };
};
