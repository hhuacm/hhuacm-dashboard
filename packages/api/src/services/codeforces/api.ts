import { z } from "zod";

const codeforcesApiBaseUrl = "https://codeforces.com/api";
const requestTimeoutMs = 10_000;

const codeforcesEnvelopeSchema = z.object({
  comment: z.string().optional(),
  result: z.unknown().optional(),
  status: z.string(),
});

const codeforcesUserInfoSchema = z.object({
  handle: z.string(),
  lastOnlineTimeSeconds: z.number().optional(),
  maxRating: z.number().optional(),
  rating: z.number().optional(),
});

const buildCodeforcesApiUrl = (
  endpoint: "user.info" | "user.status",
  searchParams: Record<string, string>
) => {
  const url = new URL(`${codeforcesApiBaseUrl}/${endpoint}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return url;
};

const loadCodeforcesResult = async (
  endpoint: "user.info" | "user.status",
  searchParams: Record<string, string>,
  handle: string
) => {
  const url = buildCodeforcesApiUrl(endpoint, searchParams);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Codeforces ${endpoint} ${handle} HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const envelope = codeforcesEnvelopeSchema.safeParse(payload);

  if (!envelope.success) {
    throw new Error(`Codeforces ${endpoint} ${handle} returned invalid JSON`);
  }

  if (envelope.data.status !== "OK" || envelope.data.result === undefined) {
    throw new Error(
      `Codeforces ${endpoint} ${handle} returned ${envelope.data.status}${
        envelope.data.comment ? `: ${envelope.data.comment}` : ""
      }`
    );
  }

  return envelope.data.result;
};

export const fetchCodeforcesUserInfo = async (handle: string) => {
  const result = await loadCodeforcesResult(
    "user.info",
    { handles: handle },
    handle
  );

  if (!Array.isArray(result)) {
    throw new Error(`Codeforces user.info ${handle} result is not an array`);
  }

  const userInfo = codeforcesUserInfoSchema.safeParse(result[0]);

  if (!userInfo.success) {
    throw new Error(`Codeforces user.info ${handle} result is invalid`);
  }

  return userInfo.data;
};

export const fetchCodeforcesSubmissions = async (handle: string) => {
  const result = await loadCodeforcesResult("user.status", { handle }, handle);

  if (!Array.isArray(result)) {
    throw new Error(`Codeforces user.status ${handle} result is not an array`);
  }

  return result;
};
