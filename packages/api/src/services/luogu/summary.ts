import type { LuoguUserPracticeDto } from "../../external/online-judge-sources/luogu/api";

interface LuoguAcceptedProblemInput {
  difficulty: null | number;
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

export const summarizeLuoguPracticeStats = (practice: LuoguUserPracticeDto) =>
  summarizeLuoguAcceptedProblems(
    practice.passed,
    practice.user.passedProblemCount
  );
