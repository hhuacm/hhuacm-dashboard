import type { LuoguUserPracticeDto } from "../../external/online-judge-sources/luogu/api";
import { luoguSource } from "../../external/online-judge-sources/luogu/api";

export type LuoguProfileStatsStatus = "empty" | "failed" | "ready";

export interface PublicLuoguDifficultyCount {
  count: number;
  difficulty: number;
  label: string;
}

export interface PublicLuoguStats {
  acceptedProblemCount: null | number;
  difficultyCounts: PublicLuoguDifficultyCount[];
  lastError: null | string;
  syncStatus: LuoguProfileStatsStatus;
}

interface LuoguAccount {
  profileUrl: string;
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
): Pick<PublicLuoguStats, "acceptedProblemCount" | "difficultyCounts"> => {
  const counts = new Map<number, number>();

  for (const problem of input.passed) {
    if (problem.difficulty === null) {
      continue;
    }

    counts.set(problem.difficulty, (counts.get(problem.difficulty) ?? 0) + 1);
  }

  return {
    acceptedProblemCount: input.passedProblemCount ?? input.passed.length,
    difficultyCounts: luoguDifficultyLabels.map((label, difficulty) => ({
      count: counts.get(difficulty) ?? 0,
      difficulty,
      label,
    })),
  };
};

const serializeLuoguPractice = (
  practice: LuoguUserPracticeDto
): PublicLuoguStats => ({
  ...summarizeLuoguPractice({
    passed: practice.passed,
    passedProblemCount: practice.user.passedProblemCount,
  }),
  lastError: null,
  syncStatus: "ready",
});

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown Luogu profile stats error";

export const getLuoguStatsForProfile = async (
  account: LuoguAccount
): Promise<PublicLuoguStats | null> => {
  const uid = parseLuoguUidFromProfileUrl(account.profileUrl);

  if (uid === null) {
    return {
      acceptedProblemCount: null,
      difficultyCounts: summarizeLuoguPractice({ passed: [] }).difficultyCounts,
      lastError: "Luogu UID is missing",
      syncStatus: "empty",
    };
  }

  try {
    return serializeLuoguPractice(await luoguSource.practice({ uid }));
  } catch (error) {
    return {
      acceptedProblemCount: null,
      difficultyCounts: summarizeLuoguPractice({ passed: [] }).difficultyCounts,
      lastError: getErrorMessage(error),
      syncStatus: "failed",
    };
  }
};
