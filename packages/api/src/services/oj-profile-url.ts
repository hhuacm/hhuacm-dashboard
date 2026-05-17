import type { OjPlatform } from "@hhuacm-dashboard/domain";

import { luoguSource } from "../external/online-judge-sources/luogu/api";

const buildLuoguProfileUrl = async (handle: string) => {
  const users = await luoguSource.searchUsers({
    keyword: handle,
  });
  const matchedUser = users.find((user) => user.name === handle);

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
