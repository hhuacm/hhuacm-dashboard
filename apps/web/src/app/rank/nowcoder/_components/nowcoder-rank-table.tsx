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
import { formatNumber, statusConfig } from "../../_shared/rank-utils";
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

const renderHandleCell = (row: RankRow) => (
  <LinkedText href={buildOjProfileUrl("nowcoder", row.nowcoder.externalId)}>
    {row.nowcoder.handle}
  </LinkedText>
);

const rankCellRenderers = {
  acceptedProblemCount: (row) =>
    formatNumber(row.nowcoder.acceptedProblemCount),
  fetchedAt: (row) => <RankRelativeTimeCell value={row.nowcoder.fetchedAt} />,
  grade: (row) => row.grade,
  handle: renderHandleCell,
  index: (_row, index) => index + 1,
  major: (row) => <RankMajorCell major={row.major} />,
  name: (row) => <RankNameCell row={row} />,
  rating: (row) => formatNumber(row.nowcoder.rating),
  status: (row) => (
    <StatusChip status={row.nowcoder.syncStatus} statusConfig={statusConfig} />
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
