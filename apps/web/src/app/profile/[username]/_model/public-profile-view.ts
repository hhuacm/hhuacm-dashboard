import {
  type MemberStatus,
  memberStatusLabels,
  type OjPlatform,
  type RefreshSyncStatus,
} from "@hhuacm-dashboard/domain";

export interface PublicOjAccount {
  atcoder?: null | {
    fetchedAt: null | string;
    rating: null | number;
    recentPerformanceAverage: null | number;
    syncStatus: RefreshSyncStatus;
  };
  codeforces?: null | {
    acceptedProblemCount: null | number;
    acceptedProblemCountInMonth: null | number;
    fetchedAt: null | string;
    lastOnlineAt: null | string;
    maxRating: null | number;
    rating: null | number;
    syncStatus: RefreshSyncStatus;
  };
  externalId: string;
  handle: string;
  luogu?: null | {
    acceptedProblemCount: null | number;
    acceptedWeightedScore: null | number;
    averageAcceptedDifficulty: null | number;
    difficultyCounts: {
      count: number;
      difficulty: number;
      label: string;
    }[];
    fetchedAt: null | string;
    syncStatus: RefreshSyncStatus;
  };
  nowcoder?: null | {
    acceptedProblemCount: null | number;
    fetchedAt: null | string;
    rating: null | number;
    syncStatus: RefreshSyncStatus;
  };
  platform: OjPlatform;
}

export interface PublicProfileAward {
  contest: string;
  event: null | string;
  level: string;
  source: "luogu";
  year: number;
}

export interface PublicProfileAwards {
  fetchedAt: null | string;
  items: PublicProfileAward[];
  syncStatus: RefreshSyncStatus;
}

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

export function formatNumber(value: null | number) {
  return value === null ? "—" : value.toLocaleString("zh-CN");
}

export function formatDateTime(value: null | string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date(value));
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

export function getCodeforcesStatusText(
  codeforces: PublicOjAccount["codeforces"] | undefined
) {
  if (!codeforces || codeforces.syncStatus === "empty") {
    return "等待刷新";
  }

  if (codeforces.syncStatus === "refreshing") {
    return codeforces.fetchedAt ? "后台刷新中" : "等待刷新";
  }

  if (codeforces.syncStatus === "failed") {
    return codeforces.fetchedAt ? "刷新失败，显示旧数据" : "刷新失败";
  }

  return "数据已更新";
}

export function getCodeforcesStatusClassName(
  codeforces: PublicOjAccount["codeforces"] | undefined
) {
  if (codeforces?.syncStatus === "failed") {
    return "text-danger";
  }

  if (codeforces?.syncStatus === "refreshing") {
    return "text-accent";
  }

  return "text-muted";
}

export function getAtcoderStatusText(
  atcoder: PublicOjAccount["atcoder"] | undefined
) {
  if (!atcoder || atcoder.syncStatus === "empty") {
    return "等待数据";
  }

  if (atcoder.syncStatus === "refreshing") {
    return atcoder.fetchedAt ? "后台刷新中" : "等待数据";
  }

  if (atcoder.syncStatus === "failed") {
    return atcoder.fetchedAt ? "刷新失败，显示旧数据" : "刷新失败";
  }

  return "数据已更新";
}

export function getAtcoderStatusClassName(
  atcoder: PublicOjAccount["atcoder"] | undefined
) {
  if (atcoder?.syncStatus === "failed") {
    return "text-danger";
  }

  return atcoder?.syncStatus === "ready" ? "text-muted" : "text-accent";
}

export function getLuoguStatusText(
  luogu: PublicOjAccount["luogu"] | undefined
) {
  if (!luogu || luogu.syncStatus === "empty") {
    return "等待数据";
  }

  if (luogu.syncStatus === "refreshing") {
    return luogu.fetchedAt ? "后台刷新中" : "等待数据";
  }

  if (luogu.syncStatus === "failed") {
    return luogu.fetchedAt ? "刷新失败，显示旧数据" : "读取失败";
  }

  return "数据已更新";
}

export function getLuoguStatusClassName(
  luogu: PublicOjAccount["luogu"] | undefined
) {
  if (luogu?.syncStatus === "failed") {
    return "text-danger";
  }

  return luogu?.syncStatus === "ready" ? "text-muted" : "text-accent";
}

export function getNowcoderStatusText(
  nowcoder: PublicOjAccount["nowcoder"] | undefined
) {
  if (!nowcoder || nowcoder.syncStatus === "empty") {
    return "等待数据";
  }

  if (nowcoder.syncStatus === "refreshing") {
    return nowcoder.fetchedAt ? "后台刷新中" : "等待数据";
  }

  if (nowcoder.syncStatus === "failed") {
    return nowcoder.fetchedAt ? "刷新失败，显示旧数据" : "刷新失败";
  }

  return "数据已更新";
}

export function getNowcoderStatusClassName(
  nowcoder: PublicOjAccount["nowcoder"] | undefined
) {
  if (nowcoder?.syncStatus === "failed") {
    return "text-danger";
  }

  return nowcoder?.syncStatus === "ready" ? "text-muted" : "text-accent";
}
