"use client";

import { Table } from "@heroui/react";
import { type CSSProperties, type Key, type ReactNode, useMemo } from "react";

import { getCodeforcesRatingClassName } from "@/utils/codeforces-rating";
import {
  EmptyCell,
  LinkedText,
  RelativeTimeCell,
  SortableColumnHeader,
  StatusChip,
} from "../../_components/rank-shared";
import {
  emptyText,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  getNameLabel,
  getProfileUrl,
  getVisibleTableMinWidth,
  isDormant,
  isRankSortColumn,
  isSortColumn,
  type RankColumnConfig,
  type RankColumnId,
  type RankRow,
  rankTableCellClassName,
  rankTableColumnClassName,
  type SortDirection,
  type SortState,
  statusConfig,
} from "../helpers";

interface CodeforcesRankTableProps {
  onSortChange: (sort: SortState) => void;
  rows: RankRow[];
  sort: SortState;
  visibleColumns: readonly RankColumnConfig[];
}

function RatingText({ value }: { value: null | number }) {
  return (
    <span className={`font-semibold ${getCodeforcesRatingClassName(value)}`}>
      {formatNumber(value)}
    </span>
  );
}

function EmptyRankCell() {
  return <EmptyCell emptyText={emptyText} />;
}

const renderNameCell = (row: RankRow) => {
  const nameLabel = getNameLabel(row);
  const profileUrl = getProfileUrl(row);

  if (profileUrl) {
    return (
      <LinkedText href={profileUrl} tone="text-foreground">
        {nameLabel}
      </LinkedText>
    );
  }

  return <span className="truncate">{nameLabel}</span>;
};

const renderMajorCell = (row: RankRow) =>
  row.major ? <span className="truncate">{row.major}</span> : <EmptyRankCell />;

const renderHandleCell = (row: RankRow) => {
  const codeforces = row.codeforces;

  if (!codeforces) {
    return <EmptyRankCell />;
  }

  return (
    <LinkedText
      href={
        codeforces.profileUrl ||
        `https://codeforces.com/profile/${encodeURIComponent(
          codeforces.handle
        )}`
      }
      tone={getCodeforcesRatingClassName(codeforces.rating)}
    >
      {codeforces.handle}
    </LinkedText>
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
      lastError={row.codeforces?.lastError}
      status={row.codeforces?.status ?? "missing-account"}
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

function renderRankColumnHeader(
  column: RankColumnConfig,
  sortDirection?: SortDirection
) {
  if (!isRankSortColumn(column.id)) {
    return column.label;
  }

  return (
    <SortableColumnHeader sortDirection={sortDirection}>
      {column.label}
    </SortableColumnHeader>
  );
}

export function CodeforcesRankTable({
  onSortChange,
  rows,
  sort,
  visibleColumns,
}: CodeforcesRankTableProps) {
  const tableStyle = useMemo<CSSProperties>(
    () => ({ minWidth: getVisibleTableMinWidth(visibleColumns) }),
    [visibleColumns]
  );
  const tableContentKey = visibleColumns.map((column) => column.id).join("|");

  const handleSortChange = (descriptor: {
    column?: Key;
    direction?: SortDirection;
  }) => {
    if (!(descriptor.column && isSortColumn(descriptor.column))) {
      return;
    }

    onSortChange({
      column: descriptor.column,
      direction: descriptor.direction ?? "ascending",
    });
  };

  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content
          aria-label="Codeforces 排行榜"
          key={tableContentKey}
          onSortChange={handleSortChange}
          sortDescriptor={sort}
          style={tableStyle}
        >
          <Table.Header>
            {visibleColumns.map((column) => (
              <Table.Column
                allowsSorting={isRankSortColumn(column.id)}
                className={rankTableColumnClassName}
                id={column.id}
                isRowHeader={column.id === "index"}
                key={column.id}
              >
                {({ sortDirection }) =>
                  renderRankColumnHeader(column, sortDirection)
                }
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {rows.map((row, index) => {
              const nameLabel = getNameLabel(row);

              return (
                <Table.Row
                  className="h-14"
                  id={row.userId}
                  key={row.userId}
                  textValue={nameLabel}
                >
                  {visibleColumns.map((column) => (
                    <Table.Cell
                      className={`${rankTableCellClassName} ${column.cellClassName}`}
                      key={column.id}
                    >
                      {renderRankCell(column.id, row, index)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
