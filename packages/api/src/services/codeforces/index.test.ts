import { describe, expect, it } from "bun:test";

import { summarizeAcceptedProblems } from ".";

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
      now
    );

    expect(summary).toEqual({
      acceptedProblemCount: 2,
      acceptedProblemCountInMonth: 1,
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
      now
    );

    expect(summary).toEqual({
      acceptedProblemCount: 1,
      acceptedProblemCountInMonth: 1,
    });
  });
});
