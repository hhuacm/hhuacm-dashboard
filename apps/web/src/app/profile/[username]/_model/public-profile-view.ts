import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import {
  type MemberStatus,
  memberStatusLabels,
} from "@hhuacm-dashboard/domain";
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
  emptyClassName?: string;
  emptyText?: string;
  failedWithoutDataText?: string;
}

export const codeforcesStatsStatusOptions = {
  emptyClassName: "text-muted",
  emptyText: "等待刷新",
} as const satisfies StatsStatusOptions;

export const luoguStatsStatusOptions = {
  failedWithoutDataText: "读取失败",
} as const satisfies StatsStatusOptions;

export const memberStatusConfig = {
  active: {
    className: "bg-success-soft text-success",
  },
  frozen: {
    className: "bg-black text-white",
  },
  retired: {
    className: "bg-default text-muted",
  },
  selection: {
    className: "bg-accent-soft text-accent",
  },
} as const satisfies Record<MemberStatus, { className: string }>;

export const luoguDifficultyClassNames = [
  "bg-[rgb(191,191,191)] text-[#333333]",
  "bg-[rgb(254,76,97)] text-white",
  "bg-[rgb(243,156,17)] text-white",
  "bg-[rgb(255,193,22)] text-[#713f12]",
  "bg-[rgb(83,196,26)] text-white",
  "bg-[rgb(52,152,219)] text-white",
  "bg-[rgb(156,61,207)] text-white",
  "bg-[rgb(14,29,105)] text-white",
] as const;

const awardLevelClassNames = {
  bronze:
    "!border-[#c7834f] !bg-[#e7b48a] !text-[#542b12] dark:!border-[#c4895a] dark:!bg-[#6b3f22] dark:!text-[#ffe6d0]",
  default:
    "!border-[#d8e0ea] !bg-[#eef2f7] !text-[#475569] dark:!border-[#3b4c68] dark:!bg-[#253349] dark:!text-[#d7e1ef]",
  gold: "!border-[#e5b94e] !bg-[#f9dfa0] !text-[#533700] dark:!border-[#d8aa42] dark:!bg-[#6f4e13] dark:!text-[#fff2c2]",
  silver:
    "!border-[#cbd5e1] !bg-[#e5e7eb] !text-[#334155] dark:!border-[#94a3b8] dark:!bg-[#475569] dark:!text-[#f8fafc]",
} as const;

export const getMemberStatusLabel = (status: MemberStatus) =>
  memberStatusLabels[status];

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

export function getAwardLevelClassName(level: string) {
  if (level.includes("金") || level.includes("一等")) {
    return awardLevelClassNames.gold;
  }

  if (level.includes("银") || level.includes("二等")) {
    return awardLevelClassNames.silver;
  }

  if (level.includes("铜") || level.includes("三等")) {
    return awardLevelClassNames.bronze;
  }

  return awardLevelClassNames.default;
}

export function getAwardStatusText(awards: PublicProfileAwards) {
  if (awards.syncStatus === "refreshing") {
    return "后台刷新中";
  }

  if (awards.syncStatus === "failed") {
    return "刷新失败，显示旧数据";
  }

  return null;
}

export function getStatsStatusText(
  stats: null | ProfileStats | undefined,
  options: StatsStatusOptions = {}
) {
  const emptyText = options.emptyText ?? "等待数据";

  if (!stats || stats.syncStatus === "empty") {
    return emptyText;
  }

  if (stats.syncStatus === "refreshing") {
    return stats.fetchedAt ? "后台刷新中" : emptyText;
  }

  if (stats.syncStatus === "failed") {
    return stats.fetchedAt
      ? "刷新失败，显示旧数据"
      : (options.failedWithoutDataText ?? "刷新失败");
  }

  return "数据已更新";
}

export function getStatsStatusClassName(
  stats: null | ProfileStats | undefined,
  options: StatsStatusOptions = {}
) {
  if (stats?.syncStatus === "failed") {
    return "text-danger";
  }

  if (!stats || stats.syncStatus === "empty") {
    return options.emptyClassName ?? "text-accent";
  }

  return stats.syncStatus === "ready" ? "text-muted" : "text-accent";
}
