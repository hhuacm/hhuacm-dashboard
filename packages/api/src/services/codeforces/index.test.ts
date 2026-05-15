import { describe, expect, it } from "bun:test";

import { summarizeAcceptedProblems } from "./summary";

describe("summarizeAcceptedProblems", () => {
  it("deduplicates accepted problems by first accepted time", () => {
    const now = 1_000_000;
    const old = now - 40 * 24 * 60 * 60;
    const recent = now - 5 * 24 * 60 * 60;

    const summary = summarizeAcceptedProblems(
      [
        {
          creationTimeSeconds: old,
          problem: { contestId: 1, index: "A" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          problem: { contestId: 1, index: "A" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          problem: { contestId: 2, index: "B" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          problem: { contestId: 3, index: "C" },
          verdict: "WRONG_ANSWER",
        },
      ],
      { acceptedSinceSeconds: now - 30 * 24 * 60 * 60 }
    );

    expect(summary).toEqual({
      acceptedProblemCount: 2,
      acceptedProblemCountSince: 1,
    });
  });

  it("uses problemsetName when contestId is absent and skips incomplete submissions", () => {
    const now = 1_000_000;
    const recent = now - 5 * 24 * 60 * 60;

    const summary = summarizeAcceptedProblems(
      [
        {
          creationTimeSeconds: recent,
          problem: { index: "A", problemsetName: "custom" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          problem: { index: "B" },
          verdict: "OK",
        },
        {
          problem: { contestId: 1, index: "C" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          problem: { contestId: 1 },
          verdict: "OK",
        },
      ],
      { acceptedSinceSeconds: now - 30 * 24 * 60 * 60 }
    );

    expect(summary).toEqual({
      acceptedProblemCount: 1,
      acceptedProblemCountSince: 1,
    });
  });

  it("summarizes accepted problems since an arbitrary timestamp", () => {
    const windowStart = 500;

    const summary = summarizeAcceptedProblems(
      [
        {
          creationTimeSeconds: 499,
          problem: { contestId: 1, index: "A" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: 500,
          problem: { contestId: 2, index: "B" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: 700,
          problem: { contestId: 3, index: "C" },
          verdict: "OK",
        },
      ],
      { acceptedSinceSeconds: windowStart }
    );

    expect(summary).toEqual({
      acceptedProblemCount: 3,
      acceptedProblemCountSince: 2,
    });
  });
});
