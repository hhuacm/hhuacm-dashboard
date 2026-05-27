"use client";

import { Table } from "@heroui/react";
import clsx from "clsx";
import { ArrowUpDown } from "lucide-react";
import { type CSSProperties, type Key, type ReactNode, useMemo } from "react";

import {
  type AdminUsersColumnId,
  type AdminUsersDisplayColumn,
  type AdminUsersTableActions,
  getAdminUsersTableMinWidth,
  getVisibleAdminUsersDisplayColumns,
  isAdminUsersSortColumn,
} from "../_model/admin-users-table-columns";
import {
  type AdminUsersSort,
  type AdminUserTableRow,
  getAdminUsernameLabel,
  type SortDirection,
} from "../helpers";

interface AdminUsersTableProps extends AdminUsersTableActions {
  onSortChange: (sort: AdminUsersSort) => void;
  sort: AdminUsersSort;
  users: AdminUserTableRow[];
  visibleColumnIds: readonly AdminUsersColumnId[];
}

const columnAlignClassNames = {
  center: "text-center",
  end: "text-right",
  start: "text-left",
} as const satisfies Record<AdminUsersDisplayColumn["align"], string>;

function SortableColumnHeader({
  align,
  children,
  sortDirection,
}: {
  align: AdminUsersDisplayColumn["align"];
  children: ReactNode;
  sortDirection?: SortDirection;
}) {
  return (
    <span
      className={clsx(
        "flex items-center gap-2",
        align === "end" ? "justify-end" : "justify-between"
      )}
    >
      <span>{children}</span>
      <ArrowUpDown
        className={clsx(
          "size-3 transition-transform",
          sortDirection === "descending" && "rotate-180",
          sortDirection ? "text-accent" : "text-muted"
        )}
      />
    </span>
  );
}

function renderColumnHeader(
  column: AdminUsersDisplayColumn,
  sortDirection?: SortDirection
) {
  if (!column.sortColumn) {
    return column.label;
  }

  return (
    <SortableColumnHeader align={column.align} sortDirection={sortDirection}>
      {column.label}
    </SortableColumnHeader>
  );
}

export function AdminUsersTable({
  onDeleteUser,
  onEditUser,
  onSortChange,
  sort,
  users,
  visibleColumnIds,
}: AdminUsersTableProps) {
  const visibleColumns = useMemo(
    () => getVisibleAdminUsersDisplayColumns(visibleColumnIds),
    [visibleColumnIds]
  );
  const tableStyle = useMemo<CSSProperties>(
    () => ({ minWidth: getAdminUsersTableMinWidth(visibleColumns) }),
    [visibleColumns]
  );
  const tableContentKey = visibleColumns.map((column) => column.id).join("|");
  const actions = useMemo(
    () => ({ onDeleteUser, onEditUser }),
    [onDeleteUser, onEditUser]
  );

  const handleSortChange = (descriptor: {
    column?: Key;
    direction?: SortDirection;
  }) => {
    if (!(descriptor.column && isAdminUsersSortColumn(descriptor.column))) {
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
          aria-label="管理员用户列表"
          key={tableContentKey}
          onSortChange={handleSortChange}
          sortDescriptor={sort}
          style={tableStyle}
        >
          <Table.Header>
            {visibleColumns.map((column) => (
              <Table.Column
                allowsSorting={Boolean(column.sortColumn)}
                className={clsx(
                  "whitespace-nowrap",
                  columnAlignClassNames[column.align],
                  column.headerClassName
                )}
                id={column.sortColumn ?? column.id}
                isRowHeader={column.isRowHeader}
                key={column.id}
                minWidth={column.minWidth}
              >
                {({ sortDirection }) =>
                  renderColumnHeader(column, sortDirection)
                }
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {users.map((user, userIndex) => {
              const usernameLabel = getAdminUsernameLabel(user);

              return (
                <Table.Row
                  className="h-14"
                  id={user.id}
                  key={user.id}
                  textValue={usernameLabel}
                >
                  {visibleColumns.map((column) => (
                    <Table.Cell
                      className={clsx(
                        "whitespace-nowrap",
                        columnAlignClassNames[column.align],
                        column.cellClassName
                      )}
                      key={column.id}
                    >
                      {column.renderCell({
                        actions,
                        row: user,
                        rowIndex: userIndex,
                      })}
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
