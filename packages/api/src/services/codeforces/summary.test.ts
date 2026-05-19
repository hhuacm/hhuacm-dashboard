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
          id: 1,
          problem: { contestId: 1, index: "A" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          id: 2,
          problem: { contestId: 1, index: "A" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          id: 3,
          problem: { contestId: 2, index: "B" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: recent,
          id: 4,
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

  it("uses problemsetName when contestId is absent", () => {
    const now = 1_000_000;
    const recent = now - 5 * 24 * 60 * 60;

    const summary = summarizeAcceptedProblems(
      [
        {
          creationTimeSeconds: recent,
          id: 1,
          problem: { index: "A", problemsetName: "custom" },
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
          id: 1,
          problem: { contestId: 1, index: "A" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: 500,
          id: 2,
          problem: { contestId: 2, index: "B" },
          verdict: "OK",
        },
        {
          creationTimeSeconds: 700,
          id: 3,
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

  it("ignores accepted submissions without a stable problem namespace", () => {
    const now = 1_000_000;
    const recent = now - 5 * 24 * 60 * 60;

    const summary = summarizeAcceptedProblems(
      [
        {
          creationTimeSeconds: recent,
          id: 1,
          problem: { index: "A" },
          verdict: "OK",
        },
      ],
      { acceptedSinceSeconds: now - 30 * 24 * 60 * 60 }
    );

    expect(summary).toEqual({
      acceptedProblemCount: 0,
      acceptedProblemCountSince: 0,
    });
  });
});
