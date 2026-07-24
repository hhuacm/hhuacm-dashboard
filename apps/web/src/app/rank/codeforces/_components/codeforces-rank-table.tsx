"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

import { getCodeforcesRatingClassName } from "@/utils/codeforces-rating";
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

interface CodeforcesRankTableProps {
  onSortChange: (sort: SortState) => void;
  rows: RankRow[];
  sort: SortState;
  visibleColumns: readonly RankColumnConfig[];
}

function RatingText({ value }: { value: null | number }) {
  return (
    <span
      className={clsx("font-semibold", getCodeforcesRatingClassName(value))}
    >
      {formatNumber(value)}
    </span>
  );
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

const renderHandleCell = (row: RankRow) => {
  const codeforces = row.codeforces;

  if (!codeforces) {
    return <EmptyRankCell />;
  }

  return (
    <span className={getCodeforcesRatingClassName(codeforces.rating)}>
      <LinkedText
        href={buildOjProfileUrl("codeforces", codeforces.externalId)}
        tone="inherit"
      >
        {codeforces.handle}
      </LinkedText>
    </span>
  );
};

const rankCellRenderers = {
  acceptedProblemCount: (row) =>
    formatNumber(row.codeforces?.acceptedProblemCount ?? null),
  acceptedProblemCountInMonth: (row) =>
    formatNumber(row.codeforces?.acceptedProblemCountInMonth ?? null),
  grade: (row) => row.grade ?? <EmptyRankCell />,
  handle: renderHandleCell,
  index: (_row, index) => index + 1,
  lastOnlineAt: (row) => (
    <RelativeTimeCell
      emptyText={emptyText}
      formatDateTime={formatDateTime}
      formatRelativeTime={formatRelativeTime}
      isDormant={isDormant}
      value={row.codeforces?.lastOnlineAt ?? null}
    />
  ),
  major: renderMajorCell,
  maxRating: (row) => <RatingText value={row.codeforces?.maxRating ?? null} />,
  name: renderNameCell,
  rating: (row) => <RatingText value={row.codeforces?.rating ?? null} />,
  status: (row) => (
    <StatusChip
      status={row.codeforces?.syncStatus ?? "missing-account"}
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

export function CodeforcesRankTable({
  onSortChange,
  rows,
  sort,
  visibleColumns,
}: CodeforcesRankTableProps) {
  return (
    <RankDataTable
      ariaLabel="Codeforces 排行榜"
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
