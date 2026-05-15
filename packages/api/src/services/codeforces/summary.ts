import type { CodeforcesProblemSummary } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toProblemKeyPart = (value: unknown) => {
  if (typeof value === "number" || typeof value === "string") {
    return String(value);
  }

  return null;
};

const toTimestampSeconds = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const summarizeAcceptedProblems = (
  submissions: unknown[],
  options: { acceptedSinceSeconds: number }
): CodeforcesProblemSummary => {
  const firstAcceptedAtByProblem = new Map<string, number>();

  for (const submission of submissions) {
    if (!isRecord(submission) || submission.verdict !== "OK") {
      continue;
    }

    if (!isRecord(submission.problem)) {
      continue;
    }

    const problemNamespace = toProblemKeyPart(
      submission.problem.contestId ?? submission.problem.problemsetName
    );
    const problemIndex = toProblemKeyPart(submission.problem.index);
    const createdAt = toTimestampSeconds(submission.creationTimeSeconds);

    if (
      problemNamespace === null ||
      problemIndex === null ||
      createdAt === null
    ) {
      continue;
    }

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
