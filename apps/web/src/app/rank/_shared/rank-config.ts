import { getUserNameLabel } from "@hhuacm-dashboard/domain";
import type { Key } from "react";

import type { TableColumnVisibilityConfig } from "@/components/column-visibility";
import {
  compareNullableNumbers,
  hasMinimumValue,
  parseMinimumFilterValue,
  type SortDirection,
} from "./rank-utils";

export interface RankMemberRowBase {
  grade?: null | string;
  major?: null | string;
  realName?: null | string;
  userId: string;
  username: string;
}

export interface RankColumnConfig<ColumnId extends string>
  extends TableColumnVisibilityConfig<ColumnId> {
  cellClassName?: string;
  minWidth: number;
}

export interface RankNumberFilterConfig<FilterKey extends string> {
  key: FilterKey;
  label: string;
  placeholder: string;
}

export interface RankFilterState<FilterKey extends string> {
  grades: string[];
  majors: string[];
  minimums: Record<FilterKey, string>;
}

export interface RankSortState<SortColumn extends string> {
  column: SortColumn;
  direction: SortDirection;
}

export interface RankBoardBaseConfig<
  Row extends Record<string, unknown>,
  ColumnId extends string,
  FilterKey extends string,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<ColumnId>,
> {
  columns: readonly ColumnConfig[];
  defaultSort: RankSortState<SortColumn>;
  emptyFilters: RankFilterState<FilterKey>;
  filterRows: (
    rows: readonly Row[],
    filters: RankFilterState<FilterKey>
  ) => Row[];
  filterSearchThreshold: number;
  numberFilterButtonText: string;
  numberFilterConfigs: readonly RankNumberFilterConfig<FilterKey>[];
  numberFilterInputMode: "decimal" | "numeric";
  sortRows: (rows: Row[], sort: RankSortState<SortColumn>) => Row[];
  storageKey: string;
}

export const defineRankConfig = <
  Row extends Record<string, unknown>,
  ColumnId extends string,
  FilterKey extends string,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<ColumnId>,
>(
  config: RankBoardBaseConfig<
    Row,
    ColumnId,
    FilterKey,
    SortColumn,
    ColumnConfig
  >
) => config;

interface CreateRankIdentityColumnsOptions {
  accountLabel: string;
  accountMinWidth?: number;
}

interface CreateRankRowsFilterOptions<
  Row extends RankMemberRowBase,
  FilterKey extends string,
  Stats extends Partial<Record<FilterKey, null | number | undefined>>,
> {
  getStats: (row: Row) => null | Stats | undefined;
  numberFilterConfigs: readonly RankNumberFilterConfig<FilterKey>[];
}

interface RankSortTieBreaker<SortColumn extends string> {
  column: SortColumn;
  direction: SortDirection;
}

interface CreateRankRowsSorterOptions<
  Row extends RankMemberRowBase,
  SortColumn extends string,
  Stats extends Partial<Record<SortColumn, null | number | string | undefined>>,
> {
  dateColumns?: readonly SortColumn[];
  getStats: (row: Row) => null | Stats | undefined;
  tieBreakers?: Partial<
    Record<SortColumn, readonly RankSortTieBreaker<SortColumn>[]>
  >;
}

export type RankIdentityColumnId =
  | "grade"
  | "handle"
  | "index"
  | "major"
  | "name";

export const createRankIdentityColumns = ({
  accountLabel,
  accountMinWidth = 128,
}: CreateRankIdentityColumnsOptions): readonly RankColumnConfig<RankIdentityColumnId>[] => [
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
    label: accountLabel,
    minWidth: accountMinWidth,
  },
];

export const createRankStatusColumn = (): RankColumnConfig<"status"> => ({
  cellClassName: "whitespace-nowrap",
  defaultVisible: false,
  id: "status",
  label: "数据状态",
  minWidth: 96,
});

export const createEmptyRankFilters = <FilterKey extends string>(
  numberFilterConfigs: readonly RankNumberFilterConfig<FilterKey>[]
): RankFilterState<FilterKey> => {
  const minimums = {} as Record<FilterKey, string>;

  for (const { key } of numberFilterConfigs) {
    minimums[key] = "";
  }

  return {
    grades: [],
    majors: [],
    minimums,
  };
};

export const createIsSortColumn =
  <SortColumn extends string>(sortableColumns: readonly SortColumn[]) =>
  (key: Key): key is SortColumn =>
    typeof key === "string" && sortableColumns.includes(key as SortColumn);

export const createIsRankSortColumn =
  <ColumnId extends string, SortColumn extends ColumnId>(
    sortableColumns: readonly SortColumn[]
  ) =>
  (columnId: ColumnId): columnId is ColumnId & SortColumn =>
    sortableColumns.includes(columnId as SortColumn);

export const getRankNameLabel = <Row extends RankMemberRowBase>(row: Row) =>
  getUserNameLabel(row);

export const getRankProfileUrl = <Row extends RankMemberRowBase>(row: Row) =>
  `/profile/${encodeURIComponent(row.username)}`;

export const createRankRowsFilter =
  <
    Row extends RankMemberRowBase,
    FilterKey extends string,
    Stats extends Partial<Record<FilterKey, null | number | undefined>>,
  >({
    getStats,
    numberFilterConfigs,
  }: CreateRankRowsFilterOptions<Row, FilterKey, Stats>) =>
  (rows: readonly Row[], filters: RankFilterState<FilterKey>): Row[] => {
    const selectedGrades = new Set(filters.grades);
    const selectedMajors = new Set(filters.majors);
    const minimumValues = new Map<FilterKey, null | number>();

    for (const { key } of numberFilterConfigs) {
      minimumValues.set(key, parseMinimumFilterValue(filters.minimums[key]));
    }

    return rows.filter((row) => {
      if (selectedGrades.size > 0 && !selectedGrades.has(row.grade ?? "")) {
        return false;
      }

      if (selectedMajors.size > 0 && !selectedMajors.has(row.major ?? "")) {
        return false;
      }

      const stats = getStats(row);

      return numberFilterConfigs.every(({ key }) =>
        hasMinimumValue(stats?.[key], minimumValues.get(key) ?? null)
      );
    });
  };

export const createRankRowsSorter = <
  Row extends RankMemberRowBase,
  SortColumn extends string,
  Stats extends Partial<Record<SortColumn, null | number | string | undefined>>,
>({
  dateColumns = [],
  getStats,
  tieBreakers = {},
}: CreateRankRowsSorterOptions<Row, SortColumn, Stats>) => {
  const dateColumnSet = new Set<SortColumn>(dateColumns);

  const getSortValue = (row: Row, column: SortColumn) => {
    const value = getStats(row)?.[column];

    if (dateColumnSet.has(column)) {
      if (!value) {
        return null;
      }

      const timestamp = new Date(String(value)).getTime();

      return Number.isFinite(timestamp) ? timestamp : null;
    }

    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };

  const compareByName = (left: Row, right: Row) =>
    getRankNameLabel(left).localeCompare(getRankNameLabel(right), "zh-CN");

  return (rows: Row[], sort: RankSortState<SortColumn>) =>
    rows.toSorted((left, right) => {
      const result = compareNullableNumbers(
        getSortValue(left, sort.column),
        getSortValue(right, sort.column),
        sort.direction
      );

      if (result !== 0) {
        return result;
      }

      for (const tieBreaker of tieBreakers[sort.column] ?? []) {
        const tieBreakerResult = compareNullableNumbers(
          getSortValue(left, tieBreaker.column),
          getSortValue(right, tieBreaker.column),
          tieBreaker.direction
        );

        if (tieBreakerResult !== 0) {
          return tieBreakerResult;
        }
      }

      return compareByName(left, right);
    });
};
