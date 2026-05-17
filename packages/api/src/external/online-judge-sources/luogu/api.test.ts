import { afterEach, describe, expect, it } from "bun:test";

import { luoguSource } from "./api";

const originalFetch = globalThis.fetch;
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

const createRedirectResponse = () =>
  Response.redirect("https://www.luogu.com.cn/user/97238/practice");

const mockJsonResponse = (payload: unknown) => {
  globalThis.fetch = Object.assign(async () => Response.json(payload), {
    preconnect: originalFetch.preconnect,
  });
};

const mockFetchResponses = (responses: Response[]) => {
  const requests: RequestInit[] = [];

  globalThis.fetch = Object.assign(
    (_url: string | URL | Request, init?: RequestInit) => {
      requests.push(init ?? {});
      const response = responses.shift();

      if (response === undefined) {
        throw new Error("Unexpected fetch call");
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

  it("filters users without the fields used by the service layer", async () => {
    mockJsonResponse({
      users: [
        {
          avatar: "https://cdn.luogu.com.cn/upload/usericon/1.png",
          name: "kkksc03",
          uid: 1,
        },
        {
          name: "missing-uid",
        },
        {
          uid: 2,
        },
      ],
    });

    await expect(
      luoguSource.searchUsers({ keyword: "kkksc03" })
    ).resolves.toEqual([
      {
        name: "kkksc03",
        uid: 1,
      },
    ]);
  });

  it("loads practice data after warming the Luogu CDN cookie", async () => {
    const requests = mockFetchResponses([
      createCdnRedirectResponse("C3VK=first"),
      Response.json({ data: practiceData }),
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

  it("reuses the cached Luogu CDN cookie across practice calls", async () => {
    const requests = mockFetchResponses([
      createCdnRedirectResponse("C3VK=reused"),
      Response.json({ data: practiceData }),
      Response.json({ data: practiceData }),
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
      Response.json({ data: practiceData }),
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
      Response.json({ data: {} }),
    ]);

    await expect(luoguSource.practice({ uid: 97_238 })).rejects.toThrow(
      "Luogu user practice returned invalid JSON"
    );
  });
});
