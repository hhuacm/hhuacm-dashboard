import {
  type OjPlatform,
  ojPlatformLabels,
  ojPlatformNames,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";

interface OjPlatformConfig {
  iconSrc: string;
  key: OjPlatform;
  label: string;
  name: string;
}

const ojPlatformConfigsByPlatform = {
  atcoder: {
    iconSrc: "/oj-icons/atcoder.png",
    label: ojPlatformLabels.atcoder,
    name: ojPlatformNames.atcoder,
  },
  codeforces: {
    iconSrc: "/oj-icons/codeforces.svg",
    label: ojPlatformLabels.codeforces,
    name: ojPlatformNames.codeforces,
  },
  luogu: {
    iconSrc: "/oj-icons/luogu.png",
    label: ojPlatformLabels.luogu,
    name: ojPlatformNames.luogu,
  },
  nowcoder: {
    iconSrc: "/oj-icons/nowcoder.png",
    label: ojPlatformLabels.nowcoder,
    name: ojPlatformNames.nowcoder,
  },
} as const satisfies Record<OjPlatform, Omit<OjPlatformConfig, "key">>;

export const getOjPlatformConfig = (
  platform: OjPlatform
): OjPlatformConfig => ({
  ...ojPlatformConfigsByPlatform[platform],
  key: platform,
});

export const ojPlatformConfigs = ojPlatforms.map(getOjPlatformConfig);

export const ojAccountExternalIdPlaceholders = {
  atcoder: "AtCoder 用户名",
  codeforces: "Codeforces Handle",
  luogu: "洛谷 UID",
  nowcoder: "牛客 UID",
} satisfies Record<OjPlatform, string>;

const ojProfileUrlPrefixes = {
  atcoder: "https://atcoder.jp/users/",
  codeforces: "https://codeforces.com/profile/",
  luogu: "https://www.luogu.com.cn/user/",
  nowcoder: "https://ac.nowcoder.com/acm/contest/profile/",
} as const satisfies Record<OjPlatform, string>;

export const buildOjProfileUrl = (platform: OjPlatform, externalId: string) =>
  `${ojProfileUrlPrefixes[platform]}${encodeURIComponent(externalId)}`;
