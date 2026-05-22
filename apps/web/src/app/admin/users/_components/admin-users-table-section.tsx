"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Chip,
  Label,
  Pagination,
  Popover,
  Spinner,
  Table,
  Tooltip,
} from "@heroui/react";
import {
  memberStatusLabels,
  ojPlatformLabels,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import clsx from "clsx";
import {
  ArrowUpDown,
  ChevronDown,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type Key,
  type ReactNode,
  useEffect,
  useMemo,
} from "react";

import { ColumnVisibilityMenu } from "@/components/column-visibility";
import { getProfileDisplayValue } from "@/utils/profile-fields";
import {
  type AdminUserOjAccount,
  type AdminUsersColumnConfig,
  type AdminUsersColumnId,
  type AdminUsersFilters,
  type AdminUsersMetadata,
  type AdminUsersSort,
  type AdminUserTableRow,
  adminUsersColumns,
  type FilterOption,
  getAdminDisplayUsername,
  getFirstVisibleSortColumn,
  getPaginationItems,
  getVisibleTableMinWidth,
  isMemberStatus,
  isSortColumn,
  memberStatusConfig,
  type SortDirection,
  type UserRole,
} from "../helpers";

interface AdminUsersVisibleColumnControls {
  resetColumns: () => void;
  setColumnVisible: (columnId: AdminUsersColumnId, isVisible: boolean) => void;
  visibleColumnIds: readonly AdminUsersColumnId[];
  visibleColumns: readonly AdminUsersColumnConfig[];
}

interface AdminUsersTableSectionProps {
  filters: AdminUsersFilters;
  hasActiveFilters: boolean;
  isFetching: boolean;
  isLoadError: boolean;
  isLoading: boolean;
  metadata: AdminUsersMetadata | undefined;
  metadataIsError: boolean;
  metadataIsLoading: boolean;
  onClearFilters: () => void;
  onDeleteUser: (user: AdminUserTableRow) => void;
  onEditUser: (user: AdminUserTableRow) => void;
  onFilterChange: (key: keyof AdminUsersFilters, values: string[]) => void;
  onSortChange: (sort: AdminUsersSort) => void;
  page: number;
  pageSize: number;
  setPage: (page: number | ((currentPage: number) => number)) => void;
  sort: AdminUsersSort;
  tableRegionRef: (element: HTMLDivElement | null) => void;
  total: number;
  totalPages: number;
  users: AdminUserTableRow[];
  visibleColumnControls: AdminUsersVisibleColumnControls;
}

interface FilterMenuProps {
  isDisabled?: boolean;
  label: string;
  onChange: (values: string[]) => void;
  options: FilterOption[];
  selectedValues: string[];
}

interface AdminUserActionsCellProps {
  memberStatus: string;
  onDelete: () => void;
  onEdit: () => void;
  role: UserRole;
  username: null | string;
}

function MemberStatusChip({ status }: { status: string }) {
  const memberStatus = isMemberStatus(status) ? status : "selection";
  const config = memberStatusConfig[memberStatus];

  return (
    <Chip color={config.color} size="sm" variant="soft">
      {memberStatusLabels[memberStatus]}
    </Chip>
  );
}

function ProfileValue({
  mono = false,
  value,
}: {
  mono?: boolean;
  value: null | string | undefined;
}) {
  const displayValue = getProfileDisplayValue(value);

  if (displayValue === "未填写") {
    return <span className="text-muted">{displayValue}</span>;
  }

  return (
    <span className={clsx(mono && "font-mono text-sm")}>{displayValue}</span>
  );
}

function OjAccountChips({ accounts }: { accounts: AdminUserOjAccount[] }) {
  if (accounts.length === 0) {
    return <span className="text-muted">未登记</span>;
  }

  const accountsByPlatform = new Map(
    accounts.map((account) => [account.platform, account])
  );

  return (
    <div className="flex min-h-7 flex-nowrap items-center gap-1.5">
      {ojPlatforms.map((platform) => {
        const account = accountsByPlatform.get(platform);

        if (!account) {
          return null;
        }

        const chip = (
          <Chip color="success" size="sm" variant="soft">
            {ojPlatformLabels[platform]}
          </Chip>
        );

        return (
          <Tooltip delay={0} key={platform}>
            <Tooltip.Trigger>
              {account.profileUrl ? (
                <a
                  className="inline-flex no-underline"
                  href={account.profileUrl}
                  rel="noopener"
                  target="_blank"
                >
                  {chip}
                </a>
              ) : (
                <span className="inline-flex">{chip}</span>
              )}
            </Tooltip.Trigger>
            <Tooltip.Content showArrow>
              <Tooltip.Arrow />
              <span className="font-mono text-xs">{account.handle}</span>
            </Tooltip.Content>
          </Tooltip>
        );
      })}
    </div>
  );
}

function AdminUserActionsCell({
  memberStatus,
  onDelete,
  onEdit,
  role,
  username,
}: AdminUserActionsCellProps) {
  const isAdminUser = role === "admin";
  const isFrozenUser = memberStatus === "frozen";
  const canDelete = Boolean(username) && !isAdminUser && isFrozenUser;
  const deleteLabel = (() => {
    if (isAdminUser) {
      return "管理员账户不能在面板删除";
    }

    if (!isFrozenUser) {
      return "只有已冻结用户才能删除";
    }

    if (!username) {
      return "缺少注册用户名，暂不能删除";
    }

    return "删除用户";
  })();

  return (
    <div className="flex min-h-7 items-center gap-1">
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button
            aria-label="修改用户"
            className="size-8"
            isIconOnly
            onPress={onEdit}
            size="sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          修改用户
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <span className="inline-flex">
            <Button
              aria-label={deleteLabel}
              className="size-8"
              isDisabled={!canDelete}
              isIconOnly
              onPress={onDelete}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow>
          <Tooltip.Arrow />
          {deleteLabel}
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

function UsersPagination({
  page,
  pageSize,
  setPage,
  total,
  totalPages,
}: {
  page: number;
  pageSize: number;
  setPage: (page: number | ((currentPage: number) => number)) => void;
  total: number;
  totalPages: number;
}) {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <Pagination className="w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Pagination.Summary>
        {startItem}-{endItem} / {total} 个用户
      </Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page === 1}
            onPress={() =>
              setPage((currentPage) => Math.max(1, currentPage - 1))
            }
          >
            <Pagination.PreviousIcon />
            <span>上一页</span>
          </Pagination.Previous>
        </Pagination.Item>
        {paginationItems.map((paginationItem) =>
          typeof paginationItem === "number" ? (
            <Pagination.Item key={paginationItem}>
              <Pagination.Link
                isActive={paginationItem === page}
                onPress={() => setPage(paginationItem)}
              >
                {paginationItem}
              </Pagination.Link>
            </Pagination.Item>
          ) : (
            <Pagination.Item key={paginationItem}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          )
        )}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={page === totalPages}
            onPress={() =>
              setPage((currentPage) => Math.min(totalPages, currentPage + 1))
            }
          >
            <span>下一页</span>
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}

function FilterMenu({
  isDisabled = false,
  label,
  onChange,
  options,
  selectedValues,
}: FilterMenuProps) {
  const selectedCount = selectedValues.length;
  const buttonLabel = selectedCount > 0 ? `${label} ${selectedCount}` : label;

  return (
    <Popover>
      <Button isDisabled={isDisabled} size="sm" variant="outline">
        <SlidersHorizontal className="size-4" />
        {buttonLabel}
        <ChevronDown className="size-4" />
      </Button>
      <Popover.Content className="w-56">
        <Popover.Dialog className="grid gap-3">
          <Popover.Heading className="font-semibold text-sm">
            {label}
          </Popover.Heading>
          {options.length > 0 ? (
            <CheckboxGroup
              className="grid gap-2"
              onChange={onChange}
              value={selectedValues}
            >
              {options.map((option) => (
                <Checkbox key={option.value} value={option.value}>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>{option.label}</Label>
                  </Checkbox.Content>
                </Checkbox>
              ))}
            </CheckboxGroup>
          ) : (
            <p className="text-muted text-sm">暂无可选项</p>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function AdminUsersFiltersToolbar({
  filters,
  hasActiveFilters,
  metadata,
  metadataIsLoading,
  onClearFilters,
  onFilterChange,
  visibleColumnControls,
}: {
  filters: AdminUsersFilters;
  hasActiveFilters: boolean;
  metadata: AdminUsersMetadata | undefined;
  metadataIsLoading: boolean;
  onClearFilters: () => void;
  onFilterChange: (key: keyof AdminUsersFilters, values: string[]) => void;
  visibleColumnControls: AdminUsersVisibleColumnControls;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu
        isDisabled={metadataIsLoading}
        label="状态"
        onChange={(values) => onFilterChange("memberStatuses", values)}
        options={metadata?.memberStatuses ?? []}
        selectedValues={filters.memberStatuses}
      />
      <FilterMenu
        isDisabled={metadataIsLoading}
        label="年级"
        onChange={(values) => onFilterChange("grades", values)}
        options={metadata?.grades ?? []}
        selectedValues={filters.grades}
      />
      <FilterMenu
        isDisabled={metadataIsLoading}
        label="OJ"
        onChange={(values) => onFilterChange("ojPlatforms", values)}
        options={metadata?.ojPlatforms ?? []}
        selectedValues={filters.ojPlatforms}
      />
      <Button
        isDisabled={!hasActiveFilters}
        onPress={onClearFilters}
        size="sm"
        variant="ghost"
      >
        <X className="size-4" />
        清除筛选
      </Button>
      <ColumnVisibilityMenu
        columns={adminUsersColumns}
        onReset={visibleColumnControls.resetColumns}
        onVisibleChange={visibleColumnControls.setColumnVisible}
        visibleColumnIds={visibleColumnControls.visibleColumnIds}
      />
      {metadataIsLoading ? (
        <span className="inline-flex items-center gap-2 text-muted text-sm">
          <Spinner color="current" size="sm" />
          正在读取筛选项
        </span>
      ) : null}
    </div>
  );
}

function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: ReactNode;
  sortDirection?: SortDirection;
}) {
  return (
    <span className="flex items-center justify-between gap-2">
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

function renderAdminUserColumnHeader(
  column: AdminUsersColumnConfig,
  sortDirection?: SortDirection
) {
  if (!isSortColumn(column.id)) {
    return column.label;
  }

  return (
    <SortableColumnHeader sortDirection={sortDirection}>
      {column.label}
    </SortableColumnHeader>
  );
}

function renderAdminUserCell(
  columnId: AdminUsersColumnId,
  user: AdminUserTableRow
) {
  if (columnId === "username") {
    return (
      <span className="block truncate">{getAdminDisplayUsername(user)}</span>
    );
  }

  if (columnId === "email") {
    return <span className="block truncate">{user.email}</span>;
  }

  if (columnId === "realName") {
    return <ProfileValue value={user.realName} />;
  }

  if (columnId === "grade") {
    return <ProfileValue value={user.grade} />;
  }

  if (columnId === "studentId") {
    return <ProfileValue mono value={user.studentId} />;
  }

  if (columnId === "major") {
    return (
      <span className="block truncate">
        <ProfileValue value={user.major} />
      </span>
    );
  }

  if (columnId === "memberStatus") {
    return <MemberStatusChip status={user.memberStatus} />;
  }

  return <OjAccountChips accounts={user.ojAccounts} />;
}

function AdminUsersTable({
  footer,
  onDeleteUser,
  onEditUser,
  onSortChange,
  sort,
  users,
  visibleColumns,
}: {
  footer: ReactNode;
  onDeleteUser: (user: AdminUserTableRow) => void;
  onEditUser: (user: AdminUserTableRow) => void;
  onSortChange: (sort: AdminUsersSort) => void;
  sort: AdminUsersSort;
  users: AdminUserTableRow[];
  visibleColumns: readonly AdminUsersColumnConfig[];
}) {
  const tableStyle = useMemo<CSSProperties>(
    () => ({ minWidth: getVisibleTableMinWidth(visibleColumns) }),
    [visibleColumns]
  );
  const tableContentKey = visibleColumns.map((column) => column.id).join("|");
  const rowHeaderColumn = visibleColumns[0];
  const otherColumns = visibleColumns.slice(1);

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
          aria-label="管理员用户列表"
          key={tableContentKey}
          onSortChange={handleSortChange}
          sortDescriptor={sort}
          style={tableStyle}
        >
          <Table.Header>
            {rowHeaderColumn ? (
              <Table.Column
                allowsSorting={isSortColumn(rowHeaderColumn.id)}
                className={rowHeaderColumn.headerClassName}
                id={rowHeaderColumn.id}
                isRowHeader
                key={rowHeaderColumn.id}
              >
                {({ sortDirection }) =>
                  renderAdminUserColumnHeader(rowHeaderColumn, sortDirection)
                }
              </Table.Column>
            ) : null}
            {otherColumns.map((column) => (
              <Table.Column
                allowsSorting={isSortColumn(column.id)}
                className={column.headerClassName}
                id={column.id}
                key={column.id}
              >
                {({ sortDirection }) =>
                  renderAdminUserColumnHeader(column, sortDirection)
                }
              </Table.Column>
            ))}
            <Table.Column
              className="whitespace-nowrap"
              id="actions"
              key="actions"
            >
              操作
            </Table.Column>
          </Table.Header>
          <Table.Body>
            {users.map((user) => {
              const usernameLabel = getAdminDisplayUsername(user);

              return (
                <Table.Row
                  className="h-14"
                  id={user.id}
                  key={user.id}
                  textValue={usernameLabel}
                >
                  {visibleColumns.map((column) => (
                    <Table.Cell
                      className={column.cellClassName}
                      key={column.id}
                    >
                      {renderAdminUserCell(column.id, user)}
                    </Table.Cell>
                  ))}
                  <Table.Cell className="whitespace-nowrap">
                    <AdminUserActionsCell
                      memberStatus={user.memberStatus}
                      onDelete={() => onDeleteUser(user)}
                      onEdit={() => onEditUser(user)}
                      role={user.role}
                      username={user.username}
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      <Table.Footer>{footer}</Table.Footer>
    </Table>
  );
}

export function AdminUsersTableSection({
  filters,
  hasActiveFilters,
  isFetching,
  isLoading,
  isLoadError,
  metadata,
  metadataIsError,
  metadataIsLoading,
  onClearFilters,
  onDeleteUser,
  onEditUser,
  onFilterChange,
  onSortChange,
  page,
  pageSize,
  setPage,
  sort,
  tableRegionRef,
  total,
  totalPages,
  users,
  visibleColumnControls,
}: AdminUsersTableSectionProps) {
  useEffect(() => {
    if (visibleColumnControls.visibleColumnIds.includes(sort.column)) {
      return;
    }

    const fallbackSortColumn = getFirstVisibleSortColumn(
      visibleColumnControls.visibleColumnIds
    );

    if (!fallbackSortColumn) {
      return;
    }

    onSortChange({
      column: fallbackSortColumn,
      direction: "ascending",
    });
  }, [onSortChange, sort.column, visibleColumnControls.visibleColumnIds]);

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Card.Title className="mt-1">{total} 个用户</Card.Title>
          </div>
          <div className="flex items-center gap-3 text-muted text-sm">
            {isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Spinner color="current" size="sm" />
                刷新中
              </span>
            ) : null}
            <span>每页 {pageSize} 条</span>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4" ref={tableRegionRef}>
        <AdminUsersFiltersToolbar
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          metadata={metadata}
          metadataIsLoading={metadataIsLoading}
          onClearFilters={onClearFilters}
          onFilterChange={onFilterChange}
          visibleColumnControls={visibleColumnControls}
        />

        {metadataIsError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                筛选项加载失败，请刷新页面后重试。
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {isLoading ? (
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>正在读取用户列表。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {isLoadError ? (
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
          footer={
            <UsersPagination
              page={page}
              pageSize={pageSize}
              setPage={setPage}
              total={total}
              totalPages={totalPages}
            />
          }
          onDeleteUser={onDeleteUser}
          onEditUser={onEditUser}
          onSortChange={onSortChange}
          sort={sort}
          users={users}
          visibleColumns={visibleColumnControls.visibleColumns}
        />

        {users.length === 0 && !isLoading ? (
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
