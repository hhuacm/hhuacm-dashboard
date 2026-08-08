import { z } from "zod";

import { requestExternalResource } from "../../request";

const luoguBaseUrl = "https://www.luogu.com.cn";
const requestTimeoutMs = 2000;
const luoguCdnCookieTtlMs = 270_000;

let luoguCdnCookie: string | null = null;
let luoguCdnCookieExpiresAt = 0;
let luoguCdnCookieRequest: Promise<string> | null = null;
let luoguCdnCookieFetch: typeof fetch | null = null;

const luoguProblemSummarySchema = z.looseObject({
  difficulty: z.number(),
  name: z.string(),
  pid: z.string(),
  type: z.string(),
});

const luoguLegacyProblemSchema = z.looseObject({
  difficulty: z.number(),
  name: z.string(),
  pid: z.string(),
});

const luoguProblemPageDataSchema = z.looseObject({
  problem: luoguLegacyProblemSchema,
});

export type LuoguProblemPageData = z.infer<typeof luoguProblemPageDataSchema>;

const luoguPracticeUserSchema = z.looseObject({
  name: z.string(),
  passedProblemCount: z.number().nullable(),
});

const luoguPracticePageDataSchema = z.looseObject({
  passed: z.array(luoguProblemSummarySchema),
  user: luoguPracticeUserSchema,
});

export type LuoguPracticePageData = z.infer<typeof luoguPracticePageDataSchema>;

const luoguPrizeSchema = z.looseObject({
  prize: z.looseObject({
    contest: z.string(),
    event: z.string().nullable(),
    prize: z.string(),
    year: z.number(),
  }),
});

const luoguUserPageDataSchema = z.looseObject({
  prizes: z.array(luoguPrizeSchema),
});

export type LuoguUserPageData = z.infer<typeof luoguUserPageDataSchema>;

const luoguPageResponseSchema = z.looseObject({
  data: z.unknown(),
  status: z.number(),
});

const buildLuoguUrl = (path: string) => new URL(path, luoguBaseUrl);

const buildLuoguProblemUrl = (pid: string) => buildLuoguUrl(`/problem/${pid}`);

const buildLuoguUserUrl = (uid: number) => buildLuoguUrl(`/user/${uid}`);

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

const user = async (params: { uid: number }): Promise<LuoguUserPageData> => {
  const payload = await fetchLuoguPageData(buildLuoguUserUrl(params.uid));
  const data = luoguPageResponseSchema.safeParse(payload);

  if (!data.success || data.data.status !== 200) {
    throw new Error("Luogu user returned invalid JSON");
  }

  const userData = luoguUserPageDataSchema.safeParse(data.data.data);

  if (!userData.success) {
    throw new Error("Luogu user returned invalid JSON");
  }

  return userData.data;
};

const problem = async (params: {
  pid: string;
}): Promise<LuoguProblemPageData> => {
  const payload = await fetchLuoguPageData(buildLuoguProblemUrl(params.pid));
  const data = luoguPageResponseSchema.safeParse(payload);

  if (!data.success || data.data.status !== 200) {
    throw new Error("Luogu problem returned invalid JSON");
  }

  const problemData = luoguProblemPageDataSchema.safeParse(data.data.data);

  if (!problemData.success) {
    throw new Error("Luogu problem returned invalid JSON");
  }

  return problemData.data;
};

const practice = async (params: {
  uid: number;
}): Promise<LuoguPracticePageData> => {
  const payload = await fetchLuoguPageData(
    buildLuoguUserPracticeUrl(params.uid)
  );
  const data = luoguPageResponseSchema.safeParse(payload);

  if (!data.success || data.data.status !== 200) {
    throw new Error("Luogu user practice returned invalid JSON");
  }

  const practice = luoguPracticePageDataSchema.safeParse(data.data.data);

  if (!practice.success) {
    throw new Error("Luogu user practice returned invalid JSON");
  }

  return practice.data;
};

export const luoguSource = {
  practice,
  problem,
  user,
};
