import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import { getUserNameLabel } from "@hhuacm-dashboard/domain";
import type { inferRouterOutputs } from "@trpc/server";
import type { Key } from "react";

import type { TableColumnVisibilityConfig } from "@/components/column-visibility";

export const emptyText = "—";

export const sortableColumns = [
  "acceptedProblemCount",
  "acceptedWeightedScore",
  "averageAcceptedDifficulty",
  "fetchedAt",
] as const;

export const numberFilterConfigs = [
  {
    key: "acceptedProblemCount",
    label: "AC 题数",
    placeholder: "AC 题数 ≥",
  },
  {
    key: "acceptedWeightedScore",
    label: "AC 加权分",
    placeholder: "加权分 ≥",
  },
  {
    key: "averageAcceptedDifficulty",
    label: "平均难度",
    placeholder: "平均难度 ≥",
  },
] as const;

const minuteSeconds = 60;
const hourSeconds = 60 * minuteSeconds;
const daySeconds = 24 * hourSeconds;
const weekSeconds = 7 * daySeconds;
const monthSeconds = 30 * daySeconds;
const yearSeconds = 365 * daySeconds;
const dormantSeconds = 30 * daySeconds;
const rankTableMinWidth = 720;

export const filterSearchThreshold = 8;
export const rankColumnVisibilityStorageKey = "rank-luogu-column-visibility-v1";
export const rankTableColumnClassName =
  "whitespace-nowrap text-center font-bold";
export const rankTableCellClassName = "text-center";

export const statusConfig = {
  empty: {
    className: "bg-default text-muted",
    label: "等待刷新",
  },
  failed: {
    className: "bg-danger-soft text-danger",
    label: "刷新失败",
  },
  "missing-account": {
    className: "bg-default text-muted",
    label: "未绑定",
  },
  ready: {
    className: "bg-success-soft text-success",
    label: "已更新",
  },
  refreshing: {
    className: "bg-accent-soft text-accent",
    label: "刷新中",
  },
  stale: {
    className: "bg-warning-soft text-warning",
    label: "待刷新",
  },
} as const;

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RankRows = RouterOutputs["rank"]["luogu"]["list"];

export type RankRow = RankRows[number];
export type SortColumn = (typeof sortableColumns)[number];
export type NumberFilterKey = (typeof numberFilterConfigs)[number]["key"];
export type SortDirection = "ascending" | "descending";
export type LuoguStatus = keyof typeof statusConfig;
export type RankColumnId =
  | "acceptedProblemCount"
  | "acceptedWeightedScore"
  | "averageAcceptedDifficulty"
  | "fetchedAt"
  | "grade"
  | "handle"
  | "index"
  | "major"
  | "name"
  | "status";

export interface RankColumnConfig
  extends TableColumnVisibilityConfig<RankColumnId> {
  cellClassName?: string;
  minWidth: number;
}

export interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface RankFilters {
  grades: string[];
  majors: string[];
  minimums: Record<NumberFilterKey, string>;
}

export const emptyRankFilters: RankFilters = {
  grades: [],
  majors: [],
  minimums: {
    acceptedProblemCount: "",
    acceptedWeightedScore: "",
    averageAcceptedDifficulty: "",
  },
};

export const rankColumns = [
  {
    cellClassName: "whitespace-nowrap font-medium text-muted",
    defaultVisible: true,
    id: "index",
    label: "序号",
    minWidth: 56,
    required: true,
  },
  {
    cellClassName: "max-w-36 whitespace-nowrap",
    defaultVisible: true,
    id: "name",
    label: "姓名",
    minWidth: 96,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "grade",
    label: "年级",
    minWidth: 80,
  },
  {
    cellClassName: "max-w-48 whitespace-nowrap",
    defaultVisible: true,
    id: "major",
    label: "专业",
    minWidth: 128,
  },
  {
    cellClassName: "max-w-44 whitespace-nowrap",
    defaultVisible: true,
    id: "handle",
    label: "洛谷账号",
    minWidth: 128,
  },
  {
    cellClassName: "whitespace-nowrap font-semibold",
    defaultVisible: true,
    id: "acceptedWeightedScore",
    label: "AC 加权分",
    minWidth: 112,
  },
  {
    cellClassName: "whitespace-nowrap font-semibold",
    defaultVisible: true,
    id: "acceptedProblemCount",
    label: "AC 题数",
    minWidth: 96,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "averageAcceptedDifficulty",
    label: "平均难度",
    minWidth: 104,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "fetchedAt",
    label: "数据更新",
    minWidth: 160,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: false,
    id: "status",
    label: "数据状态",
    minWidth: 96,
  },
] as const satisfies readonly RankColumnConfig[];

export const isSortColumn = (key: Key): key is SortColumn =>
  typeof key === "string" && sortableColumns.includes(key as SortColumn);

export const isRankSortColumn = (
  columnId: RankColumnId
): columnId is SortColumn => sortableColumns.includes(columnId as SortColumn);

export const getVisibleTableMinWidth = (
  columns: readonly RankColumnConfig[]
) => {
  let minWidth = 0;

  for (const column of columns) {
    minWidth += column.minWidth;
  }

  return Math.max(rankTableMinWidth, minWidth);
};

export const getRankFilterOptions = (
  rows: readonly RankRow[],
  key: "grade" | "major"
) => {
  const values = new Set<string>();

  for (const row of rows) {
    const value = row[key]?.trim();

    if (value) {
      values.add(value);
    }
  }

  return [...values]
    .sort((left, right) =>
      left.localeCompare(right, "zh-CN", { numeric: true })
    )
    .map((value) => ({ label: value, value }));
};

const parseMinimumFilterValue = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const hasMinimumValue = (
  value: null | number | undefined,
  minimum: null | number
) =>
  minimum === null ||
  (value !== null && value !== undefined && value >= minimum);

export const hasActiveRankFilters = (filters: RankFilters) =>
  filters.grades.length > 0 ||
  filters.majors.length > 0 ||
  numberFilterConfigs.some(({ key }) => filters.minimums[key].trim());

export const getActiveNumberFilterCount = (
  minimums: Record<NumberFilterKey, string>
) =>
  numberFilterConfigs.filter(({ key }) => minimums[key].trim().length > 0)
    .length;

export const filterRankRows = (
  rows: readonly RankRow[],
  filters: RankFilters
) => {
  const selectedGrades = new Set(filters.grades);
  const selectedMajors = new Set(filters.majors);
  const minimumValues = {
    acceptedProblemCount: parseMinimumFilterValue(
      filters.minimums.acceptedProblemCount
    ),
    acceptedWeightedScore: parseMinimumFilterValue(
      filters.minimums.acceptedWeightedScore
    ),
    averageAcceptedDifficulty: parseMinimumFilterValue(
      filters.minimums.averageAcceptedDifficulty
    ),
  };

  return rows.filter((row) => {
    if (selectedGrades.size > 0 && !selectedGrades.has(row.grade ?? "")) {
      return false;
    }

    if (selectedMajors.size > 0 && !selectedMajors.has(row.major ?? "")) {
      return false;
    }

    return numberFilterConfigs.every(({ key }) =>
      hasMinimumValue(row.luogu[key], minimumValues[key])
    );
  });
};

export const getNameLabel = (row: RankRow) => getUserNameLabel(row);

export const getProfileUrl = (row: RankRow) =>
  row.username ? `/profile/${encodeURIComponent(row.username)}` : null;

const getSortValue = (row: RankRow, column: SortColumn) => {
  const luogu = row.luogu;

  if (column === "fetchedAt") {
    return luogu.fetchedAt ? new Date(luogu.fetchedAt).getTime() : null;
  }

  return luogu[column];
};

const compareNullableNumbers = (
  left: null | number,
  right: null | number,
  direction: SortDirection
) => {
  const leftEmpty = left === null;
  const rightEmpty = right === null;

  if (leftEmpty && rightEmpty) {
    return 0;
  }

  if (leftEmpty) {
    return 1;
  }

  if (rightEmpty) {
    return -1;
  }

  const result = left - right;

  return direction === "ascending" ? result : -result;
};

const compareByName = (left: RankRow, right: RankRow) =>
  getNameLabel(left).localeCompare(getNameLabel(right), "zh-CN");

export const sortRankRows = (rows: RankRow[], sort: SortState) =>
  [...rows].sort((left, right) => {
    const result = compareNullableNumbers(
      getSortValue(left, sort.column),
      getSortValue(right, sort.column),
      sort.direction
    );

    if (result !== 0) {
      return result;
    }

    return compareByName(left, right);
  });

export const formatNumber = (value: null | number) =>
  value === null ? emptyText : value.toLocaleString("zh-CN");

export const formatDecimal = (value: null | number) =>
  value === null ? emptyText : value.toFixed(2);

export const formatDateTime = (value: null | string) => {
  if (!value) {
    return emptyText;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date(value));
};

export const formatRelativeTime = (value: null | string) => {
  if (!value) {
    return emptyText;
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );

  if (diffSeconds < minuteSeconds) {
    return "刚刚";
  }

  if (diffSeconds < hourSeconds) {
    return `${Math.floor(diffSeconds / minuteSeconds)} 分钟前`;
  }

  if (diffSeconds < daySeconds) {
    return `${Math.floor(diffSeconds / hourSeconds)} 小时前`;
  }

  if (diffSeconds < weekSeconds) {
    return `${Math.floor(diffSeconds / daySeconds)} 天前`;
  }

  if (diffSeconds < monthSeconds) {
    return `${Math.floor(diffSeconds / weekSeconds)} 周前`;
  }

  if (diffSeconds < yearSeconds) {
    return `${Math.floor(diffSeconds / monthSeconds)} 个月前`;
  }

  return `${Math.floor(diffSeconds / yearSeconds)} 年前`;
};

export const isDormant = (value: null | string) =>
  value
    ? Date.now() - new Date(value).getTime() > dormantSeconds * 1000
    : false;
