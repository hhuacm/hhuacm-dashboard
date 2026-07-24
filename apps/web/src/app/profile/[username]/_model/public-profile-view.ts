import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type PublicProfile = RouterOutputs["profile"]["get"];
export type PublicOjAccount = PublicProfile["ojAccounts"][number];
export type PublicProfileAwards = PublicProfile["awards"];
export type PublicProfileAward = PublicProfileAwards["items"][number];

interface ProfileStats {
  fetchedAt: null | string;
  syncStatus: NonNullable<PublicOjAccount["codeforces"]>["syncStatus"];
}

interface StatsStatusOptions {
  emptyText?: string;
  emptyTone?: StatsStatusTone;
  failedWithoutDataText?: string;
}

export type StatsStatusTone = "accent" | "danger" | "muted";

export interface StatsStatusPresentation {
  text: string;
  tone: StatsStatusTone;
}

export const codeforcesStatsStatusOptions = {
  emptyText: "等待刷新",
  emptyTone: "muted",
} as const satisfies StatsStatusOptions;

export const luoguStatsStatusOptions = {
  failedWithoutDataText: "读取失败",
} as const satisfies StatsStatusOptions;

const awardTierClassNames = {
  bronze:
    "border-[#c7834f] bg-[#e7b48a] text-[#542b12] dark:border-[#c4895a] dark:bg-[#6b3f22] dark:text-[#ffe6d0]",
  default:
    "border-[#d8e0ea] bg-[#eef2f7] text-[#475569] dark:border-[#3b4c68] dark:bg-[#253349] dark:text-[#d7e1ef]",
  gold: "border-[#e5b94e] bg-[#f9dfa0] text-[#533700] dark:border-[#d8aa42] dark:bg-[#6f4e13] dark:text-[#fff2c2]",
  silver:
    "border-[#cbd5e1] bg-[#e5e7eb] text-[#334155] dark:border-[#94a3b8] dark:bg-[#475569] dark:text-[#f8fafc]",
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Shanghai",
  year: "numeric",
});

export function formatNumber(value: null | number) {
  return value === null ? "—" : value.toLocaleString("zh-CN");
}

export function formatDateTime(value: null | string) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

export const getAwardTierClassName = (tier: PublicProfileAward["tier"]) =>
  awardTierClassNames[tier];

export function getAwardStatusText(awards: PublicProfileAwards) {
  if (awards.syncStatus === "refreshing") {
    return "后台刷新中";
  }

  if (awards.syncStatus === "failed") {
    return "刷新失败，显示旧数据";
  }

  return null;
}

export function getStatsStatusPresentation(
  stats: null | ProfileStats | undefined,
  options: StatsStatusOptions = {}
): StatsStatusPresentation {
  const emptyText = options.emptyText ?? "等待数据";

  if (!stats || stats.syncStatus === "empty") {
    return {
      text: emptyText,
      tone: options.emptyTone ?? "accent",
    };
  }

  if (stats.syncStatus === "refreshing") {
    return {
      text: stats.fetchedAt ? "后台刷新中" : emptyText,
      tone: "accent",
    };
  }

  if (stats.syncStatus === "failed") {
    return {
      text: stats.fetchedAt
        ? "刷新失败，显示旧数据"
        : (options.failedWithoutDataText ?? "刷新失败"),
      tone: "danger",
    };
  }

  return {
    text: "数据已更新",
    tone: "muted",
  };
}
