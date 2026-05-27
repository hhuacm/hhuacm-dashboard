import type { OjPlatform } from "@hhuacm-dashboard/domain";

import type { LuoguUserSearchResult } from "../external/online-judge-sources/luogu/api";
import { luoguSource } from "../external/online-judge-sources/luogu/api";

export type LuoguUserSearchLoader = typeof luoguSource.searchUsers;

const selectMatchedLuoguUser = (
  result: LuoguUserSearchResult,
  handle: string
) => result.users.find((user) => user.name === handle);

export const buildLuoguProfileUrl = async (
  handle: string,
  searchUsers: LuoguUserSearchLoader = luoguSource.searchUsers
) => {
  const matchedUser = selectMatchedLuoguUser(
    await searchUsers({
      keyword: handle,
    }),
    handle
  );

  if (!matchedUser) {
    return "";
  }

  return `https://www.luogu.com.cn/user/${matchedUser.uid}`;
};

export const buildOjProfileUrl = (platform: OjPlatform, handle: string) => {
  const encodedHandle = encodeURIComponent(handle);

  if (platform === "codeforces") {
    return `https://codeforces.com/profile/${encodedHandle}`;
  }

  if (platform === "atcoder") {
    return `https://atcoder.jp/users/${encodedHandle}`;
  }

  if (platform === "luogu") {
    return "";
  }

  return "";
};
