import { afterEach, describe, expect, it } from "bun:test";

import { luoguSource } from "./api";

const originalFetch = globalThis.fetch;
const userData = {
  dailyCounts: [],
  elo: [
    {
      contest: {
        endTime: 1_741_957_200,
        id: 235_262,
        name: "Luogu Round",
        startTime: 1_741_950_000,
      },
      latest: true,
      prevDiff: 120,
      rating: 1080,
      time: 1_741_957_200,
      userCount: 7,
    },
  ],
  gu: {
    scores: {
      basic: 100,
      contest: 1,
      practice: 0,
      prize: 20,
      rating: 121,
      social: 0,
    },
  },
  prizes: [
    {
      prize: {
        contest: "NOIP 提高组",
        event: null,
        prize: "二等奖",
        year: 2018,
      },
    },
  ],
  user: {
    avatar: "https://cdn.luogu.com.cn/upload/usericon/97238.png",
    background: "",
    badge: null,
    ccfLevel: 0,
    color: "Green",
    elo: null,
    eloValue: null,
    followerCount: 17,
    followingCount: 0,
    introduction: "",
    isAdmin: false,
    isBanned: false,
    name: "forlight",
    passedProblemCount: 436,
    prize: [],
    ranking: 46_589,
    registerTime: 1_523_780_429,
    slogan: "",
    submittedProblemCount: 489,
    uid: 97_238,
    xcpcLevel: 3,
  },
  userPageExtra: "kept",
};
const practiceData = {
  elo: [
    {
      contest: {
        endTime: 1_741_957_200,
        id: 235_262,
        name: "Luogu Round",
        startTime: 1_741_950_000,
      },
      latest: true,
      prevDiff: 120,
      rating: 1080,
      time: 1_741_957_200,
      userCount: 7,
    },
  ],
  passed: [
    {
      difficulty: 1,
      name: "A+B Problem",
      pid: "P1001",
      type: "P",
    },
  ],
  submitted: [
    {
      difficulty: 2,
      name: "Factorial Sum",
      pid: "P1009",
      type: "P",
    },
  ],
  user: {
    avatar: "https://cdn.luogu.com.cn/upload/usericon/97238.png",
    background: "",
    badge: null,
    ccfLevel: 0,
    color: "Blue",
    elo: null,
    eloValue: null,
    followerCount: 17,
    followingCount: 0,
    introduction: "",
    isAdmin: false,
    isBanned: false,
    name: "forlight",
    passedProblemCount: 436,
    prize: [],
    ranking: 56_573,
    registerTime: 1_523_780_429,
    slogan: "",
    submittedProblemCount: 489,
    uid: 97_238,
    userExtra: "kept",
    xcpcLevel: 3,
  },
};

const createCdnRedirectResponse = (cookie: string) =>
  new Response(null, {
    headers: {
      location: "https://www.luogu.com.cn/user/97238/practice",
      "set-cookie": `${cookie}; Max-Age=300; Path=/`,
    },
    status: 302,
  });

const createUserRedirectResponse = (cookie: string) =>
  new Response(null, {
    headers: {
      location: "https://www.luogu.com.cn/user/97238",
      "set-cookie": `${cookie}; Max-Age=300; Path=/`,
    },
    status: 302,
  });

const createRedirectResponse = () =>
  Response.redirect("https://www.luogu.com.cn/user/97238/practice");

const mockJsonResponse = (payload: unknown) => {
  globalThis.fetch = Object.assign(async () => Response.json(payload), {
    preconnect: originalFetch.preconnect,
  });
};

const mockFetchResponses = (responses: Array<Error | Response>) => {
  const requests: RequestInit[] = [];

  globalThis.fetch = Object.assign(
    (_url: string | URL | Request, init?: RequestInit) => {
      requests.push(init ?? {});
      const response = responses.shift();

      if (response === undefined) {
        return Promise.reject(new Error("Unexpected fetch call"));
      }

      if (response instanceof Error) {
        return Promise.reject(response);
      }

      return Promise.resolve(response);
    },
    {
      preconnect: originalFetch.preconnect,
    }
  );

  return requests;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("luoguSource", () => {
  it("throws when user search response has no users array", async () => {
    mockJsonResponse({});

    await expect(
      luoguSource.searchUsers({ keyword: "kkksc03" })
    ).rejects.toThrow("Luogu user/search returned invalid JSON");
  });

  it("keeps full user search payload fields", async () => {
    mockJsonResponse({
      searchExtra: "kept",
      users: [
        {
          avatar: "https://cdn.luogu.com.cn/upload/usericon/1.png",
          background: "",
          badge: null,
          ccfLevel: 0,
          color: "Red",
          isAdmin: false,
          isBanned: false,
          name: "kkksc03",
          slogan: "",
          uid: 1,
          userExtra: "kept",
          xcpcLevel: 0,
        },
      ],
    });

    await expect(
      luoguSource.searchUsers({ keyword: "kkksc03" })
    ).resolves.toEqual({
      searchExtra: "kept",
      users: [
        expect.objectContaining({
          name: "kkksc03",
          uid: 1,
          userExtra: "kept",
        }),
      ],
    });
  });

  it("retries retryable user search responses", async () => {
    const requests = mockFetchResponses([
      Response.json({}, { status: 502 }),
      Response.json({
        users: [
          {
            avatar: "https://cdn.luogu.com.cn/upload/usericon/1.png",
            background: "",
            badge: null,
            ccfLevel: 0,
            color: "Red",
            isAdmin: false,
            isBanned: false,
            name: "kkksc03",
            slogan: "",
            uid: 1,
            xcpcLevel: 0,
          },
        ],
      }),
    ]);

    await expect(
      luoguSource.searchUsers({ keyword: "kkksc03" })
    ).resolves.toEqual({
      users: [expect.objectContaining({ name: "kkksc03", uid: 1 })],
    });
    expect(requests).toHaveLength(2);
  });

  it("throws when user search users have an invalid raw shape", async () => {
    mockJsonResponse({
      users: [
        {
          name: "missing-uid",
        },
      ],
    });

    await expect(
      luoguSource.searchUsers({ keyword: "kkksc03" })
    ).rejects.toThrow("Luogu user/search returned invalid JSON");
  });

  it("loads practice data after warming the Luogu CDN cookie", async () => {
    const requests = mockFetchResponses([
      createCdnRedirectResponse("C3VK=first"),
      Response.json({ data: practiceData, status: 200 }),
    ]);

    await expect(luoguSource.practice({ uid: 97_238 })).resolves.toEqual(
      practiceData
    );

    expect(requests).toHaveLength(2);
    expect(requests[0]?.redirect).toBe("manual");
    expect(requests[1]?.headers).toMatchObject({
      cookie: "C3VK=first",
      "x-lentille-request": "content-only",
    });
  });

  it("loads user page data with public prizes", async () => {
    const requests = mockFetchResponses([
      createUserRedirectResponse("C3VK=user"),
      Response.json({ data: userData, status: 200 }),
    ]);

    await expect(luoguSource.user({ uid: 97_238 })).resolves.toEqual(userData);

    expect(requests).toHaveLength(2);
    expect(requests[0]?.redirect).toBe("manual");
    expect(requests[1]?.headers).toMatchObject({
      cookie: "C3VK=user",
      "x-lentille-request": "content-only",
    });
  });

  it("loads problem page data", async () => {
    const problemData = {
      problem: {
        difficulty: 7,
        name: "X-mouse in the Campus",
        pid: "CF1027G",
        type: "CF",
      },
    };
    const requests = mockFetchResponses([
      createCdnRedirectResponse("C3VK=problem"),
      Response.json({ data: problemData, status: 200 }),
    ]);

    await expect(luoguSource.problem({ pid: "CF1027G" })).resolves.toEqual(
      problemData
    );
    expect(requests[1]?.headers).toMatchObject({
      cookie: "C3VK=problem",
      "x-lentille-request": "content-only",
    });
  });

  it("throws when user page response has invalid JSON shape", async () => {
    mockFetchResponses([
      createUserRedirectResponse("C3VK=invalid-user"),
      Response.json({ data: {}, status: 200 }),
    ]);

    await expect(luoguSource.user({ uid: 97_238 })).rejects.toThrow(
      "Luogu user returned invalid JSON"
    );
  });

  it("reuses the cached Luogu CDN cookie across practice calls", async () => {
    const requests = mockFetchResponses([
      createCdnRedirectResponse("C3VK=reused"),
      Response.json({ data: practiceData, status: 200 }),
      Response.json({ data: practiceData, status: 200 }),
    ]);

    await luoguSource.practice({ uid: 97_238 });
    await luoguSource.practice({ uid: 97_238 });

    expect(requests).toHaveLength(3);
    expect(requests[1]?.headers).toMatchObject({ cookie: "C3VK=reused" });
    expect(requests[2]?.headers).toMatchObject({ cookie: "C3VK=reused" });
  });

  it("refreshes the Luogu CDN cookie when practice redirects", async () => {
    const requests = mockFetchResponses([
      createCdnRedirectResponse("C3VK=stale"),
      createRedirectResponse(),
      createCdnRedirectResponse("C3VK=fresh"),
      Response.json({ data: practiceData, status: 200 }),
    ]);

    await expect(luoguSource.practice({ uid: 97_238 })).resolves.toEqual(
      practiceData
    );

    expect(requests).toHaveLength(4);
    expect(requests[1]?.headers).toMatchObject({ cookie: "C3VK=stale" });
    expect(requests[3]?.headers).toMatchObject({ cookie: "C3VK=fresh" });
  });

  it("throws when practice response has invalid JSON shape", async () => {
    mockFetchResponses([
      createCdnRedirectResponse("C3VK=invalid"),
      Response.json({ data: {}, status: 200 }),
    ]);

    await expect(luoguSource.practice({ uid: 97_238 })).rejects.toThrow(
      "Luogu user practice returned invalid JSON"
    );
  });
});
