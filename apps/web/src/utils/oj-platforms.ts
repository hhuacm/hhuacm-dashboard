import {
  type OjPlatform,
  ojPlatformLabels,
  ojPlatformNames,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";

const ojPlatformIconConfigs = [
  {
    iconSrc: "/oj-icons/luogu.png",
    key: "luogu",
  },
  {
    iconSrc: "/oj-icons/codeforces.svg",
    key: "codeforces",
  },
  {
    iconSrc: "/oj-icons/atcoder.png",
    key: "atcoder",
  },
  {
    iconSrc: "/oj-icons/nowcoder.png",
    key: "nowcoder",
  },
] as const satisfies { iconSrc: string; key: OjPlatform }[];

export const ojPlatformConfigs = ojPlatforms.map((platform) => {
  const config = ojPlatformIconConfigs.find((item) => item.key === platform);

  if (!config) {
    throw new Error(`Missing OJ platform config: ${platform}`);
  }

  return {
    ...config,
    label: ojPlatformLabels[platform],
    name: ojPlatformNames[platform],
  };
});

type OjPlatformConfig = (typeof ojPlatformConfigs)[number];

export const getOjPlatformConfig = (platform: OjPlatform): OjPlatformConfig => {
  const config = ojPlatformConfigs.find((item) => item.key === platform);

  if (!config) {
    throw new Error(`Missing OJ platform config: ${platform}`);
  }

  return config;
};
