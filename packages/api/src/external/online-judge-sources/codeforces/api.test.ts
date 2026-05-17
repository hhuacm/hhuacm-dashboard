import { afterEach, describe, expect, it } from "bun:test";

import { codeforcesSource } from "./api";

const originalFetch = globalThis.fetch;

const mockJsonResponse = (payload: unknown, ok = true) => {
  globalThis.fetch = Object.assign(
    async () => Response.json(payload, { status: ok ? 200 : 500 }),
    { preconnect: originalFetch.preconnect }
  );
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("codeforcesSource", () => {
  it("throws when Codeforces envelope status is not OK", async () => {
    mockJsonResponse({
      comment: "handle: User with handle nope not found",
      status: "FAILED",
    });

    await expect(
      codeforcesSource.userInfo({ handles: "nope" })
    ).rejects.toThrow("Codeforces user.info nope returned FAILED");
  });

  it("throws when user.info result has an invalid shape", async () => {
    mockJsonResponse({
      result: [{ handle: 1 }],
      status: "OK",
    });

    await expect(
      codeforcesSource.userInfo({ handles: "tourist" })
    ).rejects.toThrow("Codeforces user.info tourist result is invalid");
  });

  it("throws when user.status result is not an array", async () => {
    mockJsonResponse({
      result: {},
      status: "OK",
    });

    await expect(
      codeforcesSource.userStatus({ handle: "tourist" })
    ).rejects.toThrow("Codeforces user.status tourist result is not an array");
  });

  it("returns only submission fields used by the service layer", async () => {
    mockJsonResponse({
      result: [
        {
          creationTimeSeconds: 1_777_136_565,
          id: 372_526_393,
          problem: {
            contestId: 2222,
            index: "H",
            name: "Counting Sort?",
            rating: 4000,
          },
          verdict: "OK",
        },
        {
          creationTimeSeconds: 1_777_136_191,
          problem: {
            index: "A",
          },
          verdict: "OK",
        },
      ],
      status: "OK",
    });

    await expect(
      codeforcesSource.userStatus({ handle: "tourist" })
    ).resolves.toEqual([
      {
        creationTimeSeconds: 1_777_136_565,
        problem: {
          contestId: 2222,
          index: "H",
        },
        verdict: "OK",
      },
    ]);
  });
});
