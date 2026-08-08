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
  "acceptedProblemCountInMonth",
  "lastOnlineAt",
  "maxRating",
  "rating",
] as const;

const numberFilterConfigs = [
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
] as const satisfies readonly RankNumberFilterConfig<string>[];

const rankColumnVisibilityStorageKey = "rank-codeforces-column-visibility-v1";

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
    accountLabel: "CF 账号",
  }),
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
  NonNullable<RankRow["codeforces"]>
>({
  getStats: (row) => row.codeforces,
  numberFilterConfigs,
});

const sortRankRows = createRankRowsSorter<
  RankRow,
  SortColumn,
  NonNullable<RankRow["codeforces"]>
>({
  dateColumns: ["lastOnlineAt"],
  getStats: (row) => row.codeforces,
});

export const codeforcesRankConfig = defineRankConfig({
  columns: rankColumns,
  defaultSort,
  emptyFilters: emptyRankFilters,
  filterRows: filterRankRows,
  numberFilterButtonText: "Rating 与 AC 数",
  numberFilterConfigs,
  numberFilterInputMode: "numeric",
  sortRows: sortRankRows,
  storageKey: rankColumnVisibilityStorageKey,
});
