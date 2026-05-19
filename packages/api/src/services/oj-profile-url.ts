import type { OjPlatform } from "@hhuacm-dashboard/domain";

import type { LuoguUserSearchResult } from "../external/online-judge-sources/luogu/api";
import { luoguSource } from "../external/online-judge-sources/luogu/api";

const selectMatchedLuoguUser = (
  result: LuoguUserSearchResult,
  handle: string
) => result.users.find((user) => user.name === handle);

const buildLuoguProfileUrl = async (handle: string) => {
  const matchedUser = selectMatchedLuoguUser(
    await luoguSource.searchUsers({
      keyword: handle,
    }),
    handle
  );

  if (!matchedUser) {
    return "";
  }

  return `https://www.luogu.com.cn/user/${matchedUser.uid}`;
};

export const buildOjProfileUrl = async (
  platform: OjPlatform,
  handle: string
) => {
  const encodedHandle = encodeURIComponent(handle);

  if (platform === "codeforces") {
    return `https://codeforces.com/profile/${encodedHandle}`;
  }

  if (platform === "atcoder") {
    return `https://atcoder.jp/users/${encodedHandle}`;
  }

  if (platform === "luogu") {
    return await buildLuoguProfileUrl(handle);
  }

  return "";
};
