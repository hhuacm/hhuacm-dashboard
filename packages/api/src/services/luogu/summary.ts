import type { LuoguPracticePageData } from "../../external/online-judge-sources/luogu/api";

interface LuoguAcceptedProblemInput {
  difficulty: null | number;
}

interface LuoguPracticeStatsInput {
  passed: LuoguPracticePageData["passed"];
  passedProblemCount: LuoguPracticePageData["user"]["passedProblemCount"];
}

export interface LuoguStatsSummary {
  acceptedProblemCount: number;
  acceptedWeightedScore: number;
  averageAcceptedDifficulty: null | number;
}

export const getLuoguDifficultyWeight = (difficulty: null | number) =>
  difficulty ?? 0;

export const summarizeLuoguAcceptedProblems = (
  problems: LuoguAcceptedProblemInput[],
  passedProblemCount?: null | number
): LuoguStatsSummary => {
  let acceptedWeightedScore = 0;
  let difficultySum = 0;
  let difficultyCount = 0;

  for (const problem of problems) {
    acceptedWeightedScore += getLuoguDifficultyWeight(problem.difficulty);

    if (problem.difficulty !== null) {
      difficultySum += problem.difficulty;
      difficultyCount += 1;
    }
  }

  return {
    acceptedProblemCount: passedProblemCount ?? problems.length,
    acceptedWeightedScore,
    averageAcceptedDifficulty:
      difficultyCount === 0 ? null : difficultySum / difficultyCount,
  };
};

export const summarizeLuoguPracticeStats = (
  practice: LuoguPracticeStatsInput
) =>
  summarizeLuoguAcceptedProblems(practice.passed, practice.passedProblemCount);
