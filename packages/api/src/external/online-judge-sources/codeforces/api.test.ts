import { afterEach, describe, expect, it } from "bun:test";

import { codeforcesSource } from "./api";

const originalFetch = globalThis.fetch;

const mockJsonResponse = (payload: unknown, ok = true) => {
  globalThis.fetch = Object.assign(
    async () => Response.json(payload, { status: ok ? 200 : 500 }),
    { preconnect: originalFetch.preconnect }
  );
};

const mockJsonResponseSequence = (responses: Response[]) => {
  globalThis.fetch = Object.assign(
    () => {
      const response = responses.shift();

      if (!response) {
        return Promise.reject(new Error("Unexpected extra fetch"));
      }

      return Promise.resolve(response);
    },
    { preconnect: originalFetch.preconnect }
  );
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("codeforcesSource", () => {
  it("retries transient request failures", async () => {
    let requestCount = 0;
    globalThis.fetch = Object.assign(
      () => {
        requestCount += 1;

        if (requestCount === 1) {
          return Promise.reject(
            new Error(
              "Unable to connect. Is the computer able to access the url?"
            )
          );
        }

        return Promise.resolve(
          Response.json({
            result: [{ handle: "tourist" }],
            status: "OK",
          })
        );
      },
      { preconnect: originalFetch.preconnect }
    );

    await expect(
      codeforcesSource.userInfo({ handles: "tourist" })
    ).resolves.toEqual([{ handle: "tourist" }]);
    expect(requestCount).toBe(2);
  });

  it("retries retryable HTTP status responses", async () => {
    mockJsonResponseSequence([
      Response.json({ status: "FAILED" }, { status: 502 }),
      Response.json({
        result: [{ handle: "tourist" }],
        status: "OK",
      }),
    ]);

    await expect(
      codeforcesSource.userInfo({ handles: "tourist" })
    ).resolves.toEqual([{ handle: "tourist" }]);
  });

  it("does not retry non-retryable HTTP status responses", async () => {
    let requestCount = 0;
    globalThis.fetch = Object.assign(
      () => {
        requestCount += 1;

        return Promise.resolve(
          Response.json({ status: "FAILED" }, { status: 403 })
        );
      },
      { preconnect: originalFetch.preconnect }
    );

    await expect(
      codeforcesSource.userInfo({ handles: "tourist" })
    ).rejects.toThrow("Codeforces user.info tourist HTTP 403");
    expect(requestCount).toBe(1);
  });

  it("throws when Codeforces envelope status is not OK", async () => {
    mockJsonResponse({
      comment: "handle: User with handle nope not found",
      status: "FAILED",
    });

    await expect(
      codeforcesSource.userInfo({ handles: "nope" })
    ).rejects.toThrow("Codeforces user.info nope returned FAILED");
  });

  it("keeps known and extra user.info fields", async () => {
    mockJsonResponse({
      result: [
        {
          avatar: "https://userpic.codeforces.org/422/avatar.jpg",
          customField: "kept",
          handle: "tourist",
          rating: 3470,
        },
      ],
      status: "OK",
    });

    await expect(
      codeforcesSource.userInfo({ handles: "tourist" })
    ).resolves.toEqual([
      {
        avatar: "https://userpic.codeforces.org/422/avatar.jpg",
        customField: "kept",
        handle: "tourist",
        rating: 3470,
      },
    ]);
  });

  it("keeps known and extra user.status fields", async () => {
    mockJsonResponse({
      result: [
        {
          creationTimeSeconds: 1_777_136_565,
          id: 372_526_393,
          problem: {
            contestId: 2222,
            customProblemField: "kept",
            index: "H",
            name: "Counting Sort?",
            rating: 4000,
          },
          unexpectedSubmissionField: "kept",
          verdict: "OK",
        },
        {
          creationTimeSeconds: 1_777_136_191,
          id: 372_526_394,
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
        id: 372_526_393,
        problem: {
          contestId: 2222,
          customProblemField: "kept",
          index: "H",
          name: "Counting Sort?",
          rating: 4000,
        },
        unexpectedSubmissionField: "kept",
        verdict: "OK",
      },
      {
        creationTimeSeconds: 1_777_136_191,
        id: 372_526_394,
        problem: {
          index: "A",
        },
        verdict: "OK",
      },
    ]);
  });

  it("throws when user.status result has an invalid raw shape", async () => {
    mockJsonResponse({
      result: {
        unexpected: true,
      },
      status: "OK",
    });

    await expect(
      codeforcesSource.userStatus({ handle: "tourist" })
    ).rejects.toThrow("Codeforces user.status tourist result is invalid");
  });

  it("throws when user.info result has an invalid raw shape", async () => {
    mockJsonResponse({
      result: [
        {
          handle: 1,
        },
      ],
      status: "OK",
    });

    await expect(
      codeforcesSource.userInfo({ handles: "tourist" })
    ).rejects.toThrow("Codeforces user.info tourist result is invalid");
  });
});
