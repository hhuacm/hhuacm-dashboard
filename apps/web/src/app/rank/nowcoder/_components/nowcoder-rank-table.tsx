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

interface NowcoderRankTableProps {
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
    <LinkedText href={getRankProfileUrl(row)} tone="text-foreground">
      {nameLabel}
    </LinkedText>
  );
};

const renderMajorCell = (row: RankRow) =>
  row.major ? <span className="truncate">{row.major}</span> : <EmptyRankCell />;

const renderHandleCell = (row: RankRow) => (
  <LinkedText href={buildOjProfileUrl("nowcoder", row.nowcoder.externalId)}>
    {row.nowcoder.handle}
  </LinkedText>
);

const rankCellRenderers = {
  acceptedProblemCount: (row) =>
    formatNumber(row.nowcoder.acceptedProblemCount),
  fetchedAt: (row) => (
    <RelativeTimeCell
      emptyText={emptyText}
      formatDateTime={formatDateTime}
      formatRelativeTime={formatRelativeTime}
      isDormant={isDormant}
      value={row.nowcoder.fetchedAt}
    />
  ),
  grade: (row) => row.grade ?? <EmptyRankCell />,
  handle: renderHandleCell,
  index: (_row, index) => index + 1,
  major: renderMajorCell,
  name: renderNameCell,
  rating: (row) => formatNumber(row.nowcoder.rating),
  status: (row) => (
    <StatusChip
      status={row.nowcoder.syncStatus ?? "missing-account"}
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

export function NowcoderRankTable({
  onSortChange,
  rows,
  sort,
  visibleColumns,
}: NowcoderRankTableProps) {
  return (
    <RankDataTable
      ariaLabel="Nowcoder 排行榜"
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
