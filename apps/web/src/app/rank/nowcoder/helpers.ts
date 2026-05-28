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
  "fetchedAt",
  "rating",
] as const;

const numberFilterConfigs = [
  {
    key: "acceptedProblemCount",
    label: "AC 题数",
    placeholder: "AC 题数 ≥",
  },
  {
    key: "rating",
    label: "Rating",
    placeholder: "Rating ≥",
  },
] as const satisfies readonly RankNumberFilterConfig<string>[];

const filterSearchThreshold = 8;
const rankColumnVisibilityStorageKey = "rank-nowcoder-column-visibility-v1";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RankRows = RouterOutputs["rank"]["nowcoder"]["list"];

export type RankRow = RankRows[number];
export type SortColumn = (typeof sortableColumns)[number];
export type NumberFilterKey = (typeof numberFilterConfigs)[number]["key"];
export type RankColumnId =
  | "acceptedProblemCount"
  | "fetchedAt"
  | "grade"
  | "handle"
  | "index"
  | "major"
  | "name"
  | "rating"
  | "status";

export type RankColumnConfig = SharedRankColumnConfig<RankColumnId>;
export type SortState = RankSortState<SortColumn>;
export type RankFilters = RankFilterState<NumberFilterKey>;

const defaultSort: SortState = {
  column: "acceptedProblemCount",
  direction: "descending",
};

const emptyRankFilters = createEmptyRankFilters(numberFilterConfigs);

const rankColumns = [
  ...createRankIdentityColumns({
    accountLabel: "牛客账号",
  }),
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
    id: "rating",
    label: "Rating",
    minWidth: 88,
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
  RankRow["nowcoder"]
>({
  getStats: (row) => row.nowcoder,
  numberFilterConfigs,
});

const sortRankRows = createRankRowsSorter<
  RankRow,
  SortColumn,
  RankRow["nowcoder"]
>({
  dateColumns: ["fetchedAt"],
  getStats: (row) => row.nowcoder,
  tieBreakers: {
    acceptedProblemCount: [
      {
        column: "rating",
        direction: "descending",
      },
    ],
  },
});

export const nowcoderRankConfig = defineRankConfig({
  columns: rankColumns,
  defaultSort,
  emptyFilters: emptyRankFilters,
  filterRows: filterRankRows,
  filterSearchThreshold,
  numberFilterButtonText: "AC 与 Rating",
  numberFilterConfigs,
  numberFilterInputMode: "decimal",
  sortRows: sortRankRows,
  storageKey: rankColumnVisibilityStorageKey,
});
