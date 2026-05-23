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

export const filterSearchThreshold = 8;
export const rankColumnVisibilityStorageKey = "rank-luogu-column-visibility-v1";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RankRows = RouterOutputs["rank"]["luogu"]["list"];

export type RankRow = RankRows[number];
export type SortColumn = (typeof sortableColumns)[number];
export type NumberFilterKey = (typeof numberFilterConfigs)[number]["key"];
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
  `/profile/${encodeURIComponent(row.username)}`;

const getSortValue = (row: RankRow, column: SortColumn) => {
  const luogu = row.luogu;

  if (column === "fetchedAt") {
    return luogu.fetchedAt ? new Date(luogu.fetchedAt).getTime() : null;
  }

  return luogu[column];
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
