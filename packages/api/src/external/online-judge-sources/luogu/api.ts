import { z } from "zod";

const luoguApiBaseUrl = "https://www.luogu.com.cn/api";
const requestTimeoutMs = 2000;

const luoguUserSearchSchema = z.object({
  users: z.array(z.unknown()),
});

const buildLuoguApiUrl = (
  path: string,
  searchParams: Record<string, string>
) => {
  const url = new URL(`${luoguApiBaseUrl}${path}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return url;
};

const buildLuoguUserSearchUrl = (keyword: string) =>
  buildLuoguApiUrl("/user/search", { keyword });

const searchUsers = async (params: { keyword: string }) => {
  const url = buildLuoguUserSearchUrl(params.keyword);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Luogu user/search HTTP ${response.status}`);
  }

  const payload: unknown = await response.json();
  const data = luoguUserSearchSchema.safeParse(payload);

  if (!data.success) {
    throw new Error("Luogu user/search returned invalid JSON");
  }

  return data.data.users;
};

export const luoguSource = {
  searchUsers,
};
