import { describe, expect, it } from "bun:test";

import { mockJsonResponse } from "../../test-fetch";
import { codeforcesSource } from "./api";

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

  it("keeps known user.info fields", async () => {
    mockJsonResponse({
      result: [
        {
          avatar: "https://userpic.codeforces.org/422/avatar.jpg",
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
        handle: "tourist",
        rating: 3470,
      },
    ]);
  });

  it("keeps known user.status fields", async () => {
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
          index: "H",
          name: "Counting Sort?",
          rating: 4000,
        },
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
