import type { ojPlatforms } from "@hhuacm-dashboard/db/schema/oj-account";

import { luoguSource } from "../external/online-judge-sources/luogu/api";

const buildLuoguProfileUrl = async (handle: string) => {
  try {
    const users = await luoguSource.searchUsers({
      keyword: handle,
    });
    const matchedUser = users.find((user: unknown) => {
      if (typeof user !== "object" || user === null) {
        return false;
      }

      return (
        Reflect.get(user, "name") === handle &&
        typeof Reflect.get(user, "uid") === "number"
      );
    });

    if (!matchedUser) {
      return "";
    }

    return `https://www.luogu.com.cn/user/${Reflect.get(matchedUser, "uid")}`;
  } catch {
    return "";
  }
};

export const buildOjProfileUrl = async (
  platform: (typeof ojPlatforms)[number],
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
