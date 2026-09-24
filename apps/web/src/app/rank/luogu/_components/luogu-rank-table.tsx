"use client";

import type { ReactNode } from "react";

import { buildOjProfileUrl } from "@/utils/oj-platforms";
import {
  LinkedText,
  RankDataTable,
  RankMajorCell,
  RankNameCell,
  RankRelativeTimeCell,
  StatusChip,
} from "../../_components/rank-shared";
import { getRankNameLabel } from "../../_shared/rank-config";
import {
  formatDecimal,
  formatNumber,
  statusConfig,
} from "../../_shared/rank-utils";
import {
  isRankSortColumn,
  isSortColumn,
  type RankColumnConfig,
  type RankColumnId,
  type RankRow,
  type SortState,
} from "../helpers";

interface LuoguRankTableProps {
  onSortChange: (sort: SortState) => void;
  rows: RankRow[];
  sort: SortState;
  visibleColumns: readonly RankColumnConfig[];
}

const renderHandleCell = (row: RankRow) => (
  <LinkedText href={buildOjProfileUrl("luogu", row.luogu.externalId)}>
    {row.luogu.handle}
  </LinkedText>
);

const rankCellRenderers = {
  acceptedProblemCount: (row) => formatNumber(row.luogu.acceptedProblemCount),
  acceptedWeightedScore: (row) => formatNumber(row.luogu.acceptedWeightedScore),
  averageAcceptedDifficulty: (row) =>
    formatDecimal(row.luogu.averageAcceptedDifficulty),
  fetchedAt: (row) => <RankRelativeTimeCell value={row.luogu.fetchedAt} />,
  grade: (row) => row.grade,
  handle: renderHandleCell,
  index: (_row, index) => index + 1,
  major: (row) => <RankMajorCell major={row.major} />,
  name: (row) => <RankNameCell row={row} />,
  status: (row) => (
    <StatusChip status={row.luogu.syncStatus} statusConfig={statusConfig} />
  ),
} as const satisfies Record<
  RankColumnId,
  (row: RankRow, index: number) => ReactNode
>;

function renderRankCell(columnId: RankColumnId, row: RankRow, index: number) {
  return rankCellRenderers[columnId](row, index);
}

export function LuoguRankTable({
  onSortChange,
  rows,
  sort,
  visibleColumns,
}: LuoguRankTableProps) {
  return (
    <RankDataTable
      ariaLabel="Luogu 排行榜"
      getRowId={(row) => row.userId}
      getRowTextValue={getRankNameLabel}
      isRankSortColumn={isRankSortColumn}
      isSortColumn={isSortColumn}
      onSortChange={onSortChange}
      renderCell={renderRankCell}
      rows={rows}
      sort={sort}
      visibleColumns={visibleColumns}
    />
  );
}
