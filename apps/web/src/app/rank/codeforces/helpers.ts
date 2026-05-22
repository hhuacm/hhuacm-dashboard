import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import { getUserNameLabel } from "@hhuacm-dashboard/domain";
import type { inferRouterOutputs } from "@trpc/server";
import type { Key } from "react";

import type { TableColumnVisibilityConfig } from "@/components/column-visibility";

import {
  compareNullableNumbers,
  hasMinimumValue,
  parseMinimumFilterValue,
  type SortDirection,
} from "../_shared/rank-utils";

export const sortableColumns = [
  "acceptedProblemCount",
  "acceptedProblemCountInMonth",
  "lastOnlineAt",
  "maxRating",
  "rating",
] as const;

export const numberFilterConfigs = [
  {
    key: "rating",
    label: "Rating",
    placeholder: "Rating ≥",
  },
  {
    key: "maxRating",
    label: "最高 Rating",
    placeholder: "最高 Rating ≥",
  },
  {
    key: "acceptedProblemCount",
    label: "AC 题数",
    placeholder: "AC 题数 ≥",
  },
  {
    key: "acceptedProblemCountInMonth",
    label: "近 30 天 AC",
    placeholder: "近 30 天 AC ≥",
  },
] as const;

export const filterSearchThreshold = 8;
export const rankColumnVisibilityStorageKey =
  "rank-codeforces-column-visibility-v1";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RankRows = RouterOutputs["rank"]["codeforces"]["list"];

export type RankRow = RankRows[number];
export type SortColumn = (typeof sortableColumns)[number];
export type NumberFilterKey = (typeof numberFilterConfigs)[number]["key"];
export type RankColumnId =
  | "acceptedProblemCount"
  | "acceptedProblemCountInMonth"
  | "grade"
  | "handle"
  | "index"
  | "lastOnlineAt"
  | "major"
  | "maxRating"
  | "name"
  | "rating"
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
    acceptedProblemCountInMonth: "",
    maxRating: "",
    rating: "",
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
    label: "CF 账号",
    minWidth: 128,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "rating",
    label: "Rating",
    minWidth: 88,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "maxRating",
    label: "最高 Rating",
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
    cellClassName: "whitespace-nowrap font-semibold",
    defaultVisible: true,
    id: "acceptedProblemCountInMonth",
    label: "近 30 天 AC",
    minWidth: 112,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "lastOnlineAt",
    label: "最近活跃",
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
    acceptedProblemCountInMonth: parseMinimumFilterValue(
      filters.minimums.acceptedProblemCountInMonth
    ),
    maxRating: parseMinimumFilterValue(filters.minimums.maxRating),
    rating: parseMinimumFilterValue(filters.minimums.rating),
  };

  return rows.filter((row) => {
    if (selectedGrades.size > 0 && !selectedGrades.has(row.grade ?? "")) {
      return false;
    }

    if (selectedMajors.size > 0 && !selectedMajors.has(row.major ?? "")) {
      return false;
    }

    return numberFilterConfigs.every(({ key }) =>
      hasMinimumValue(row.codeforces?.[key], minimumValues[key])
    );
  });
};

export const getNameLabel = (row: RankRow) => getUserNameLabel(row);

export const getProfileUrl = (row: RankRow) =>
  row.username ? `/profile/${encodeURIComponent(row.username)}` : null;

const getSortValue = (row: RankRow, column: SortColumn) => {
  const codeforces = row.codeforces;

  if (!codeforces) {
    return null;
  }

  if (column === "lastOnlineAt") {
    return codeforces.lastOnlineAt
      ? new Date(codeforces.lastOnlineAt).getTime()
      : null;
  }

  return codeforces[column];
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
