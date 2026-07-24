"use client";

import type { ReactNode } from "react";

import { buildOjProfileUrl } from "@/utils/oj-platforms";
import {
  EmptyCell,
  LinkedText,
  RankDataTable,
  RelativeTimeCell,
  StatusChip,
} from "../../_components/rank-shared";
import { getRankNameLabel, getRankProfileUrl } from "../../_shared/rank-config";
import {
  emptyText,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatRelativeTime,
  isDormant,
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

function EmptyRankCell() {
  return <EmptyCell emptyText={emptyText} />;
}

const renderNameCell = (row: RankRow) => {
  const nameLabel = getRankNameLabel(row);

  return (
    <LinkedText href={getRankProfileUrl(row)} tone="inherit">
      {nameLabel}
    </LinkedText>
  );
};

const renderMajorCell = (row: RankRow) =>
  row.major ? <span className="truncate">{row.major}</span> : <EmptyRankCell />;

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
  fetchedAt: (row) => (
    <RelativeTimeCell
      emptyText={emptyText}
      formatDateTime={formatDateTime}
      formatRelativeTime={formatRelativeTime}
      isDormant={isDormant}
      value={row.luogu.fetchedAt}
    />
  ),
  grade: (row) => row.grade ?? <EmptyRankCell />,
  handle: renderHandleCell,
  index: (_row, index) => index + 1,
  major: renderMajorCell,
  name: renderNameCell,
  status: (row) => (
    <StatusChip
      status={row.luogu.syncStatus ?? "missing-account"}
      statusConfig={statusConfig}
    />
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
