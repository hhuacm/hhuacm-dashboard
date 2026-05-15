export const ojPlatformConfigs = [
  {
    iconSrc: "/oj-icons/luogu.png",
    key: "luogu",
    label: "洛谷",
    name: "Luogu",
  },
  {
    iconSrc: "/oj-icons/codeforces.svg",
    key: "codeforces",
    label: "Codeforces",
    name: "Codeforces",
  },
  {
    iconSrc: "/oj-icons/atcoder.png",
    key: "atcoder",
    label: "AtCoder",
    name: "AtCoder",
  },
  {
    iconSrc: "/oj-icons/nowcoder.png",
    key: "nowcoder",
    label: "牛客",
    name: "Nowcoder",
  },
] as const;

export type OjPlatform = (typeof ojPlatformConfigs)[number]["key"];

export const getOjPlatformConfig = (platform: OjPlatform) =>
  ojPlatformConfigs.find((config) => config.key === platform);

export const isOjPlatform = (value: string): value is OjPlatform =>
  ojPlatformConfigs.some((config) => config.key === value);
