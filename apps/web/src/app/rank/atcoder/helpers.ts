import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";

import {
  createEmptyRankFilters,
  createIsRankSortColumn,
  createIsSortColumn,
  createRankIdentityColumns,
  createRankRowsFilter,
  createRankRowsSorter,
  createRankStatusColumn,
  defineRankConfig,
  type RankFilterState,
  type RankNumberFilterConfig,
  type RankSortState,
  type RankColumnConfig as SharedRankColumnConfig,
} from "../_shared/rank-config";

const sortableColumns = [
  "fetchedAt",
  "rating",
  "recentPerformanceAverage",
] as const;

const numberFilterConfigs = [
  {
    key: "rating",
    label: "Rating",
    placeholder: "Rating ≥",
  },
  {
    key: "recentPerformanceAverage",
    label: "近三场表现",
    placeholder: "表现均值 ≥",
  },
] as const satisfies readonly RankNumberFilterConfig<string>[];

const filterSearchThreshold = 8;
const rankColumnVisibilityStorageKey = "rank-atcoder-column-visibility-v1";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RankRows = RouterOutputs["rank"]["atcoder"]["list"];

export type RankRow = RankRows[number];
export type SortColumn = (typeof sortableColumns)[number];
export type NumberFilterKey = (typeof numberFilterConfigs)[number]["key"];
export type RankColumnId =
  | "fetchedAt"
  | "grade"
  | "handle"
  | "index"
  | "major"
  | "name"
  | "rating"
  | "recentPerformanceAverage"
  | "status";

export type RankColumnConfig = SharedRankColumnConfig<RankColumnId>;
export type SortState = RankSortState<SortColumn>;
export type RankFilters = RankFilterState<NumberFilterKey>;

const defaultSort: SortState = {
  column: "rating",
  direction: "descending",
};

const emptyRankFilters = createEmptyRankFilters(numberFilterConfigs);

const rankColumns = [
  ...createRankIdentityColumns({
    accountLabel: "AtCoder 账号",
    accountMinWidth: 144,
  }),
  {
    cellClassName: "whitespace-nowrap font-semibold",
    defaultVisible: true,
    id: "rating",
    label: "Rating",
    minWidth: 88,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "recentPerformanceAverage",
    label: "近三场表现",
    minWidth: 128,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "fetchedAt",
    label: "数据更新",
    minWidth: 160,
  },
  createRankStatusColumn(),
] as const satisfies readonly RankColumnConfig[];

export const isSortColumn = createIsSortColumn(sortableColumns);

export const isRankSortColumn = createIsRankSortColumn<
  RankColumnId,
  SortColumn
>(sortableColumns);

const filterRankRows = createRankRowsFilter<
  RankRow,
  NumberFilterKey,
  RankRow["atcoder"]
>({
  getStats: (row) => row.atcoder,
  numberFilterConfigs,
});

const sortRankRows = createRankRowsSorter<
  RankRow,
  SortColumn,
  RankRow["atcoder"]
>({
  dateColumns: ["fetchedAt"],
  getStats: (row) => row.atcoder,
  tieBreakers: {
    rating: [
      {
        column: "recentPerformanceAverage",
        direction: "descending",
      },
    ],
  },
});

export const atcoderRankConfig = defineRankConfig({
  columns: rankColumns,
  defaultSort,
  emptyFilters: emptyRankFilters,
  filterRows: filterRankRows,
  filterSearchThreshold,
  numberFilterButtonText: "Rating 与表现",
  numberFilterConfigs,
  numberFilterInputMode: "numeric",
  sortRows: sortRankRows,
  storageKey: rankColumnVisibilityStorageKey,
});
