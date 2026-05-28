"use client";

import { Table } from "@heroui/react";
import clsx from "clsx";
import { type CSSProperties, type Key, type ReactNode, useMemo } from "react";

import { buildOjProfileUrl } from "@/utils/oj-platforms";
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
  formatDecimal,
  formatNumber,
  formatRelativeTime,
  getVisibleTableMinWidth,
  isDormant,
  rankTableCellClassName,
  rankTableColumnClassName,
  type SortDirection,
  statusConfig,
} from "../../_shared/rank-utils";
import {
  getNameLabel,
  getProfileUrl,
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
  const nameLabel = getNameLabel(row);

  return (
    <LinkedText href={getProfileUrl(row)} tone="text-foreground">
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

export function LuoguRankTable({
  onSortChange,
  rows,
  sort,
  visibleColumns,
}: LuoguRankTableProps) {
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
          aria-label="Luogu 排行榜"
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
                      className={clsx(
                        rankTableCellClassName,
                        column.cellClassName
                      )}
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
