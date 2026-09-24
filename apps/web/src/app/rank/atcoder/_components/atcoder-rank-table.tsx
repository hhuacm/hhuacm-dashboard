"use client";

import type { ReactNode } from "react";

import { buildOjProfileUrl } from "@/utils/oj-platforms";
import {
  LinkedText,
  RankDataTable,
  RankMajorCell,
  RankNameCell,
  RelativeTimeCell,
  StatusChip,
} from "../../_components/rank-shared";
import { getRankNameLabel } from "../../_shared/rank-config";
import {
  emptyText,
  formatDateTime,
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

interface AtcoderRankTableProps {
  onSortChange: (sort: SortState) => void;
  rows: RankRow[];
  sort: SortState;
  visibleColumns: readonly RankColumnConfig[];
}

const renderHandleCell = (row: RankRow) => (
  <LinkedText href={buildOjProfileUrl("atcoder", row.atcoder.externalId)}>
    {row.atcoder.handle}
  </LinkedText>
);

const rankCellRenderers = {
  fetchedAt: (row) => (
    <RelativeTimeCell
      emptyText={emptyText}
      formatDateTime={formatDateTime}
      formatRelativeTime={formatRelativeTime}
      isDormant={isDormant}
      value={row.atcoder.fetchedAt}
    />
  ),
  grade: (row) => row.grade,
  handle: renderHandleCell,
  index: (_row, index) => index + 1,
  major: (row) => <RankMajorCell major={row.major} />,
  name: (row) => <RankNameCell row={row} />,
  rating: (row) => formatNumber(row.atcoder.rating),
  recentPerformanceAverage: (row) =>
    formatNumber(row.atcoder.recentPerformanceAverage),
  status: (row) => (
    <StatusChip status={row.atcoder.syncStatus} statusConfig={statusConfig} />
  ),
} as const satisfies Record<
  RankColumnId,
  (row: RankRow, index: number) => ReactNode
>;

function renderRankCell(columnId: RankColumnId, row: RankRow, index: number) {
  return rankCellRenderers[columnId](row, index);
}

export function AtcoderRankTable({
  onSortChange,
  rows,
  sort,
  visibleColumns,
}: AtcoderRankTableProps) {
  return (
    <RankDataTable
      ariaLabel="AtCoder 排行榜"
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
