import { z } from "zod";

import {
  isCommonRetryableHttpStatus,
  requestExternalResource,
} from "../../request";

const luoguBaseUrl = "https://www.luogu.com.cn";
const requestMaxAttempts = 3;
const requestRetryDelayMs = 500;
const requestTimeoutMs = 2000;
const luoguCdnCookieTtlMs = 270_000;

let luoguCdnCookie: string | null = null;
let luoguCdnCookieExpiresAt = 0;
let luoguCdnCookieRequest: Promise<string> | null = null;
let luoguCdnCookieFetch: typeof fetch | null = null;

const luoguUserSearchSchema = z.object({
  users: z.array(z.unknown()),
});

const luoguSearchUserSchema = z.object({
  name: z.string(),
  uid: z.number(),
});

export type LuoguSearchUserDto = z.infer<typeof luoguSearchUserSchema>;

const luoguProblemSummarySchema = z.object({
  difficulty: z.number().nullable(),
  name: z.string(),
  pid: z.string(),
  type: z.string(),
});

const luoguContestSummarySchema = z.object({
  endTime: z.number(),
  id: z.number(),
  name: z.string(),
  startTime: z.number(),
});

const luoguEloRatingSchema = z.object({
  contest: luoguContestSummarySchema.optional(),
  latest: z.boolean(),
  prevDiff: z.number().nullable(),
  rating: z.number(),
  time: z.number(),
  userCount: z.number(),
});

const luoguUserPracticeUserSchema = z.object({
  avatar: z.string(),
  background: z.string(),
  badge: z.unknown().nullable(),
  ccfLevel: z.number(),
  color: z.string(),
  elo: z.unknown().nullable(),
  eloValue: z.number().nullable(),
  followerCount: z.number(),
  followingCount: z.number(),
  introduction: z.string().nullable(),
  isAdmin: z.boolean(),
  isBanned: z.boolean(),
  name: z.string(),
  passedProblemCount: z.number().nullable(),
  prize: z.array(
    z.object({
      contestName: z.string(),
      prize: z.string(),
      year: z.number(),
    })
  ),
  ranking: z.number().nullable(),
  registerTime: z.number(),
  slogan: z.string(),
  submittedProblemCount: z.number().nullable(),
  uid: z.number(),
  xcpcLevel: z.number(),
});

const luoguUserPracticeSchema = z.object({
  elo: z.array(luoguEloRatingSchema),
  passed: z.array(luoguProblemSummarySchema),
  submitted: z.array(luoguProblemSummarySchema),
  user: luoguUserPracticeUserSchema,
});

const luoguUserPracticeResponseSchema = z.object({
  data: luoguUserPracticeSchema,
});

export type LuoguUserPracticeDto = z.infer<typeof luoguUserPracticeSchema>;

const buildLuoguUrl = (
  path: string,
  searchParams: Record<string, string> = {}
) => {
  const url = new URL(path, luoguBaseUrl);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return url;
};

const buildLuoguUserSearchUrl = (keyword: string) =>
  buildLuoguUrl("/api/user/search", { keyword });

const buildLuoguUserPracticeUrl = (uid: number) =>
  buildLuoguUrl(`/user/${uid}/practice`);

const getSetCookieHeaderValues = (headers: Headers) => {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = headersWithSetCookie.getSetCookie?.();

  if (setCookies !== undefined) {
    return setCookies;
  }

  const setCookie = headers.get("set-cookie");

  return setCookie === null ? [] : [setCookie];
};

const getLuoguCdnCookieFromHeaders = (headers: Headers) => {
  for (const setCookie of getSetCookieHeaderValues(headers)) {
    const [cookie] = setCookie.split(";");

    if (cookie?.startsWith("C3VK=")) {
      return cookie;
    }
  }

  return null;
};

const resetLuoguCdnCookieWhenFetchChanges = () => {
  if (luoguCdnCookieFetch === globalThis.fetch) {
    return;
  }

  luoguCdnCookie = null;
  luoguCdnCookieExpiresAt = 0;
  luoguCdnCookieRequest = null;
  luoguCdnCookieFetch = globalThis.fetch;
};

const getLuoguCdnCookie = async (url: URL, forceRefresh = false) => {
  resetLuoguCdnCookieWhenFetchChanges();

  if (
    !(forceRefresh || luoguCdnCookie === null) &&
    Date.now() < luoguCdnCookieExpiresAt
  ) {
    return luoguCdnCookie;
  }

  if (luoguCdnCookieRequest !== null) {
    return await luoguCdnCookieRequest;
  }

  luoguCdnCookieRequest = requestExternalResource({
    label: "Luogu CDN cookie",
    maxAttempts: requestMaxAttempts,
    request: async (signal) =>
      await fetch(url, {
        headers: {
          accept: "application/json, text/plain, */*",
          referer: url.toString(),
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "x-lentille-request": "content-only",
        },
        redirect: "manual",
        signal,
      }),
    retryDelayMs: requestRetryDelayMs,
    retryableStatus: isCommonRetryableHttpStatus,
    timeoutMs: requestTimeoutMs,
  })
    .then((response) => {
      const cookie = getLuoguCdnCookieFromHeaders(response.headers);

      if (cookie === null) {
        throw new Error("Luogu CDN cookie was not set");
      }

      luoguCdnCookie = cookie;
      luoguCdnCookieExpiresAt = Date.now() + luoguCdnCookieTtlMs;

      return cookie;
    })
    .finally(() => {
      luoguCdnCookieRequest = null;
    });

  return await luoguCdnCookieRequest;
};

const fetchLuoguPageData = async (url: URL) => {
  const request = async (cookie: string) =>
    await requestExternalResource({
      label: "Luogu page data",
      maxAttempts: requestMaxAttempts,
      request: async (signal) =>
        await fetch(url, {
          headers: {
            accept: "application/json, text/plain, */*",
            cookie,
            referer: url.toString(),
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "x-lentille-request": "content-only",
          },
          redirect: "manual",
          signal,
        }),
      retryDelayMs: requestRetryDelayMs,
      retryableStatus: isCommonRetryableHttpStatus,
      timeoutMs: requestTimeoutMs,
    });

  const cookie = await getLuoguCdnCookie(url);
  let response = await request(cookie);

  if (response.status === 302) {
    const refreshedCookie = await getLuoguCdnCookie(url, true);
    response = await request(refreshedCookie);
  }

  if (response.status === 302) {
    throw new Error("Luogu page data redirected after refreshing CDN cookie");
  }

  if (!response.ok) {
    throw new Error(`Luogu page data HTTP ${response.status}`);
  }

  return (await response.json()) as unknown;
};

const searchUsers = async (params: { keyword: string }) => {
  const url = buildLuoguUserSearchUrl(params.keyword);

  const response = await requestExternalResource({
    label: "Luogu user/search",
    maxAttempts: requestMaxAttempts,
    request: async (signal) => await fetch(url, { signal }),
    retryDelayMs: requestRetryDelayMs,
    retryableStatus: isCommonRetryableHttpStatus,
    timeoutMs: requestTimeoutMs,
  });

  if (!response.ok) {
    throw new Error(`Luogu user/search HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const data = luoguUserSearchSchema.safeParse(payload);

  if (!data.success) {
    throw new Error("Luogu user/search returned invalid JSON");
  }

  return data.data.users.flatMap((user) => {
    const parsedUser = luoguSearchUserSchema.safeParse(user);

    return parsedUser.success ? [parsedUser.data] : [];
  });
};

const practice = async (params: { uid: number }) => {
  const payload = await fetchLuoguPageData(
    buildLuoguUserPracticeUrl(params.uid)
  );
  const data = luoguUserPracticeResponseSchema.safeParse(payload);

  if (!data.success) {
    throw new Error("Luogu user practice returned invalid JSON");
  }

  return data.data.data;
};

export const luoguSource = {
  practice,
  searchUsers,
};
