import type { CodeforcesSubmissionResult } from "../../external/online-judge-sources/codeforces/api";
import type { CodeforcesProblemSummary } from "./types";

export const summarizeAcceptedProblems = (
  submissions: CodeforcesSubmissionResult,
  options: { acceptedSinceSeconds: number }
): CodeforcesProblemSummary => {
  const firstAcceptedAtByProblem = new Map<string, number>();

  for (const submission of submissions) {
    if (submission.verdict !== "OK") {
      continue;
    }

    const problemNamespace =
      submission.problem.contestId ?? submission.problem.problemsetName;

    if (problemNamespace === undefined) {
      continue;
    }

    const problemIndex = submission.problem.index;
    const createdAt = submission.creationTimeSeconds;

    const problemId = `${problemNamespace}${problemIndex}`;
    const currentFirstAcceptedAt = firstAcceptedAtByProblem.get(problemId);

    if (
      currentFirstAcceptedAt === undefined ||
      createdAt < currentFirstAcceptedAt
    ) {
      firstAcceptedAtByProblem.set(problemId, createdAt);
    }
  }

  let acceptedProblemCountSince = 0;

  for (const firstAcceptedAt of firstAcceptedAtByProblem.values()) {
    if (firstAcceptedAt >= options.acceptedSinceSeconds) {
      acceptedProblemCountSince += 1;
    }
  }

  return {
    acceptedProblemCount: firstAcceptedAtByProblem.size,
    acceptedProblemCountSince,
  };
};
