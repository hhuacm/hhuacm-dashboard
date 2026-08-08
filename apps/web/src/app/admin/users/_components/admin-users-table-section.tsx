"use client";

import { Alert, Card, Spinner } from "@heroui/react";

import type { AdminUsersVisibleColumnControls } from "../_model/admin-users-table-columns";
import type {
  AdminUsersFilterOptions,
  AdminUsersFilters,
  AdminUsersSort,
  AdminUserTableRow,
} from "../helpers";
import { AdminUsersTable } from "./admin-users-table";
import { AdminUsersToolbar } from "./admin-users-toolbar";

type AdminUsersListStatus = "error" | "loading" | "ready" | "refreshing";

interface AdminUsersTableSectionProps {
  filterOptions: AdminUsersFilterOptions;
  filters: AdminUsersFilters;
  hasActiveFilters: boolean;
  listStatus: AdminUsersListStatus;
  onClearFilters: () => void;
  onDeleteUser: (user: AdminUserTableRow) => void;
  onEditUser: (user: AdminUserTableRow) => void;
  onFilterChange: (key: keyof AdminUsersFilters, values: string[]) => void;
  onSortChange: (sort: AdminUsersSort) => void;
  sort: AdminUsersSort;
  total: number;
  users: AdminUserTableRow[];
  visibleColumnControls: AdminUsersVisibleColumnControls;
}

export function AdminUsersTableSection({
  filterOptions,
  filters,
  hasActiveFilters,
  listStatus,
  onClearFilters,
  onDeleteUser,
  onEditUser,
  onFilterChange,
  onSortChange,
  sort,
  total,
  users,
  visibleColumnControls,
}: AdminUsersTableSectionProps) {
  return (
    <Card>
      <Card.Header>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Card.Title className="mt-1">{total} 个用户</Card.Title>
          </div>
          <div className="flex items-center gap-3 text-muted text-sm">
            {listStatus === "refreshing" ? (
              <span className="inline-flex items-center gap-2">
                <Spinner color="current" size="sm" />
                刷新中
              </span>
            ) : null}
            <span>
              {hasActiveFilters ? `显示 ${users.length} 个` : "全部显示"}
            </span>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4">
        <AdminUsersToolbar
          filterOptions={filterOptions}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          onFilterChange={onFilterChange}
          visibleColumnControls={visibleColumnControls}
        />

        {listStatus === "loading" ? (
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>正在读取用户列表。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {listStatus === "error" ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                用户列表加载失败，请稍后重试。
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <AdminUsersTable
          onDeleteUser={onDeleteUser}
          onEditUser={onEditUser}
          onSortChange={onSortChange}
          sort={sort}
          users={users}
          visibleColumnIds={visibleColumnControls.visibleColumnIds}
        />

        {users.length === 0 && listStatus === "ready" ? (
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>暂无用户。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </Card.Content>
    </Card>
  );
}
