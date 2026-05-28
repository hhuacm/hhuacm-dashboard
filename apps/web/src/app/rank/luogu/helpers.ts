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
  "acceptedProblemCount",
  "acceptedWeightedScore",
  "averageAcceptedDifficulty",
  "fetchedAt",
] as const;

const numberFilterConfigs = [
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
] as const satisfies readonly RankNumberFilterConfig<string>[];

const filterSearchThreshold = 8;
const rankColumnVisibilityStorageKey = "rank-luogu-column-visibility-v1";

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

export type RankColumnConfig = SharedRankColumnConfig<RankColumnId>;
export type SortState = RankSortState<SortColumn>;
export type RankFilters = RankFilterState<NumberFilterKey>;

const defaultSort: SortState = {
  column: "acceptedWeightedScore",
  direction: "descending",
};

const emptyRankFilters = createEmptyRankFilters(numberFilterConfigs);

const rankColumns = [
  ...createRankIdentityColumns({
    accountLabel: "洛谷账号",
  }),
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
  RankRow["luogu"]
>({
  getStats: (row) => row.luogu,
  numberFilterConfigs,
});

const sortRankRows = createRankRowsSorter<
  RankRow,
  SortColumn,
  RankRow["luogu"]
>({
  dateColumns: ["fetchedAt"],
  getStats: (row) => row.luogu,
});

export const luoguRankConfig = defineRankConfig({
  columns: rankColumns,
  defaultSort,
  emptyFilters: emptyRankFilters,
  filterRows: filterRankRows,
  filterSearchThreshold,
  numberFilterButtonText: "AC 指标",
  numberFilterConfigs,
  numberFilterInputMode: "decimal",
  sortRows: sortRankRows,
  storageKey: rankColumnVisibilityStorageKey,
});
