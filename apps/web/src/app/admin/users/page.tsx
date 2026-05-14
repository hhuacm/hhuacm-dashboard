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
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type Key,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  ColumnVisibilityMenu,
  type TableColumnVisibilityConfig,
  useColumnVisibility,
} from "@/components/column-visibility";
import { authClient } from "@/utils/auth-client";
import { getProfileDisplayValue } from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";

const redirectDelayMs = 3000;
const defaultPageSize = 10;
const minPageSize = 5;
const maxPageSize = 80;
const tableRowHeightPx = 56;
const tableReservedHeightPx = 156;
const viewportBottomGapPx = 40;
const compactPaginationLimit = 7;
const paginationNeighborCount = 1;
const adminUsersColumnVisibilityStorageKey = "admin-users-column-visibility-v1";

const sortableColumns = [
  "email",
  "grade",
  "major",
  "memberStatus",
  "realName",
  "studentId",
  "username",
] as const;

const memberStatusConfig = {
  active: {
    color: "success",
    label: "服役中",
  },
  frozen: {
    color: "danger",
    label: "已冻结",
  },
  retired: {
    color: "default",
    label: "已退役",
  },
  selection: {
    color: "accent",
    label: "选拔中",
  },
} as const;

const ojPlatformLabels = {
  atcoder: "AtCoder",
  codeforces: "Codeforces",
  luogu: "洛谷",
  nowcoder: "牛客",
} as const;

const ojPlatformOrder = ["luogu", "codeforces", "atcoder", "nowcoder"] as const;

type MemberStatus = keyof typeof memberStatusConfig;
type OjPlatform = keyof typeof ojPlatformLabels;
type PageItem = "leading-ellipsis" | "trailing-ellipsis" | number;
type SortColumn = (typeof sortableColumns)[number];
type SortDirection = "ascending" | "descending";
type AdminUsersColumnId =
  | "email"
  | "grade"
  | "major"
  | "memberStatus"
  | "ojAccounts"
  | "realName"
  | "studentId"
  | "username";

interface AdminUsersColumnConfig
  extends TableColumnVisibilityConfig<AdminUsersColumnId> {
  cellClassName?: string;
  headerClassName?: string;
  minWidth: number;
}

interface FilterOption {
  label: string;
  value: string;
}

interface AdminUsersFilters {
  grades: string[];
  memberStatuses: MemberStatus[];
  ojPlatforms: OjPlatform[];
}

interface AdminUsersSort {
  column: SortColumn;
  direction: SortDirection;
}

interface AdminUserOjAccount {
  handle: string;
  platform: OjPlatform;
  profileUrl: string;
}

interface AdminUserTableRow {
  displayUsername: null | string;
  email: string;
  grade: null | string;
  id: string;
  major: null | string;
  memberStatus: string;
  name: string;
  ojAccounts: AdminUserOjAccount[];
  realName: null | string;
  studentId: null | string;
  username: null | string;
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

interface AccessFeedbackProps {
  isAccessError: boolean;
  isCheckingAccess: boolean;
  isMember: boolean;
  shouldPromptLogin: boolean;
}

interface AdminUsersMetadata {
  grades: FilterOption[];
  memberStatuses: FilterOption[];
  ojPlatforms: FilterOption[];
}

interface FilterMenuProps {
  isDisabled?: boolean;
  label: string;
  onChange: (values: string[]) => void;
  options: FilterOption[];
  selectedValues: string[];
}

interface AdminUsersVisibleColumnControls {
  resetColumns: () => void;
  setColumnVisible: (columnId: AdminUsersColumnId, isVisible: boolean) => void;
  visibleColumnIds: readonly AdminUsersColumnId[];
  visibleColumns: readonly AdminUsersColumnConfig[];
}

const clampPageSize = (pageSize: number) =>
  Math.min(maxPageSize, Math.max(minPageSize, pageSize));

const emptyAdminUsersFilters: AdminUsersFilters = {
  grades: [],
  memberStatuses: [],
  ojPlatforms: [],
};

const adminUsersColumns = [
  {
    cellClassName: "max-w-48 whitespace-nowrap font-medium",
    defaultVisible: true,
    id: "username",
    label: "用户名",
    minWidth: 192,
  },
  {
    cellClassName: "max-w-72 whitespace-nowrap",
    defaultVisible: true,
    id: "email",
    label: "邮箱",
    minWidth: 256,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "realName",
    label: "姓名",
    minWidth: 128,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: false,
    id: "grade",
    label: "年级",
    minWidth: 96,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: false,
    id: "studentId",
    label: "学号",
    minWidth: 136,
  },
  {
    cellClassName: "max-w-64 whitespace-nowrap",
    defaultVisible: false,
    id: "major",
    label: "专业",
    minWidth: 176,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "memberStatus",
    label: "状态",
    minWidth: 112,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "ojAccounts",
    label: "OJ 账号",
    minWidth: 220,
  },
] as const satisfies readonly AdminUsersColumnConfig[];

const getVisibleTableMinWidth = (
  columns: readonly AdminUsersColumnConfig[]
) => {
  let minWidth = 0;

  for (const column of columns) {
    minWidth += column.minWidth;
  }

  return Math.max(720, minWidth);
};

const getFirstVisibleSortColumn = (
  columnIds: readonly AdminUsersColumnId[]
) => {
  for (const columnId of columnIds) {
    if (isSortColumn(columnId)) {
      return columnId;
    }
  }

  return null;
};

const calculatePageSize = (element: HTMLDivElement | null) => {
  if (!element) {
    return defaultPageSize;
  }

  const { top } = element.getBoundingClientRect();
  const availableHeight =
    window.innerHeight - top - viewportBottomGapPx - tableReservedHeightPx;
  const visibleRows = Math.floor(availableHeight / tableRowHeightPx);

  return clampPageSize(visibleRows);
};

const getAdminDisplayUsername = (user: AdminUserTableRow) => {
  const candidates = [user.displayUsername, user.username, user.name];

  for (const candidate of candidates) {
    const value = candidate?.trim();

    if (value) {
      return value;
    }
  }

  return "未设置";
};

const isMemberStatus = (status: string): status is MemberStatus =>
  status in memberStatusConfig;

const isSortColumn = (key: Key): key is SortColumn =>
  typeof key === "string" &&
  sortableColumns.includes(key as (typeof sortableColumns)[number]);

const isMemberStatusFilterValue = (value: string): value is MemberStatus =>
  value in memberStatusConfig;

const isOjPlatformFilterValue = (value: string): value is OjPlatform =>
  value in ojPlatformLabels;

const hasFilters = (filters: AdminUsersFilters) =>
  filters.grades.length > 0 ||
  filters.memberStatuses.length > 0 ||
  filters.ojPlatforms.length > 0;

const getPaginationItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= compactPaginationLimit) {
    const pages: PageItem[] = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      pages.push(pageNumber);
    }

    return pages;
  }

  const pages: PageItem[] = [1];

  if (page > 3) {
    pages.push("leading-ellipsis");
  }

  const startPage = Math.max(2, page - paginationNeighborCount);
  const endPage = Math.min(totalPages - 1, page + paginationNeighborCount);

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber += 1) {
    pages.push(pageNumber);
  }

  if (page < totalPages - 2) {
    pages.push("trailing-ellipsis");
  }

  pages.push(totalPages);

  return pages;
};

function useAutoPageSize(): {
  pageSize: number;
  tableRegionRef: (element: HTMLDivElement | null) => void;
} {
  const [tableRegionElement, setTableRegionElement] =
    useState<null | HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const tableRegionRef = useCallback((element: HTMLDivElement | null) => {
    setTableRegionElement(element);
  }, []);

  useEffect(() => {
    const updatePageSize = () => {
      const nextPageSize = calculatePageSize(tableRegionElement);
      setPageSize((currentPageSize) => {
        if (currentPageSize === nextPageSize) {
          return currentPageSize;
        }

        return nextPageSize;
      });
    };

    updatePageSize();
    window.addEventListener("resize", updatePageSize);

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updatePageSize);

    if (tableRegionElement) {
      resizeObserver?.observe(tableRegionElement);
    }

    return () => {
      window.removeEventListener("resize", updatePageSize);
      resizeObserver?.disconnect();
    };
  }, [tableRegionElement]);

  return { pageSize, tableRegionRef };
}

function MemberStatusChip({ status }: { status: string }) {
  const config = isMemberStatus(status)
    ? memberStatusConfig[status]
    : memberStatusConfig.selection;

  return (
    <Chip color={config.color} size="sm" variant="soft">
      {config.label}
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
    <span className={mono ? "font-mono text-sm" : undefined}>
      {displayValue}
    </span>
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
      {ojPlatformOrder.map((platform) => {
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
        className={`size-3 transition-transform ${
          sortDirection === "descending" ? "rotate-180" : ""
        } ${sortDirection ? "text-accent" : "text-muted"}`}
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
  onSortChange,
  sort,
  users,
  visibleColumns,
}: {
  footer: ReactNode;
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
          </Table.Header>
          <Table.Body>
            {users.map((user) => {
              const displayUsername = getAdminDisplayUsername(user);

              return (
                <Table.Row
                  className="h-14"
                  id={user.id}
                  key={user.id}
                  textValue={displayUsername}
                >
                  {visibleColumns.map((column) => (
                    <Table.Cell
                      className={column.cellClassName}
                      key={column.id}
                    >
                      {renderAdminUserCell(column.id, user)}
                    </Table.Cell>
                  ))}
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

function AccessFeedback({
  isAccessError,
  isCheckingAccess,
  isMember,
  shouldPromptLogin,
}: AccessFeedbackProps) {
  return (
    <>
      {isCheckingAccess ? (
        <div className="flex items-center gap-3">
          <Spinner color="current" size="sm" />
          <p className="font-medium">正在确认管理员权限。</p>
        </div>
      ) : null}

      {shouldPromptLogin ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>请登录管理员账户</Alert.Title>
            <Alert.Description>
              即将跳转到登录页面，登录后会回到用户列表。
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {isMember ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>不具备管理员权限</Alert.Title>
            <Alert.Description>即将跳转到首页。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {isAccessError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>权限确认失败</Alert.Title>
            <Alert.Description>请刷新页面后重试。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </>
  );
}

function AdminUsersTableSection({
  filters,
  hasActiveFilters,
  isFetching,
  isLoading,
  isLoadError,
  metadata,
  metadataIsError,
  metadataIsLoading,
  onClearFilters,
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
            <Card.Description>全部账号</Card.Description>
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

export default function AdminUsersPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminUsersFilters>(
    emptyAdminUsersFilters
  );
  const [sort, setSort] = useState<AdminUsersSort>({
    column: "username",
    direction: "ascending",
  });
  const { pageSize, tableRegionRef } = useAutoPageSize();
  const previousPageSizeRef = useRef(pageSize);
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
      retry: false,
    })
  );
  const isAdmin = accountMe.data?.role === "admin";
  const isMember = Boolean(accountMe.data && !isAdmin);
  const isCheckingAccess =
    session.isPending || (Boolean(user) && accountMe.isPending);
  const shouldPromptLogin = !(session.isPending || user);

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      const timeoutId = window.setTimeout(() => {
        router.push("/login?redirect=/admin/users");
      }, redirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }

    if (isMember) {
      const timeoutId = window.setTimeout(() => {
        router.push("/");
      }, redirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isMember, router, session.isPending, user]);

  useEffect(() => {
    const previousPageSize = previousPageSizeRef.current;

    if (previousPageSize === pageSize) {
      return;
    }

    setPage((currentPage) => {
      const firstItemIndex = (currentPage - 1) * previousPageSize;
      return Math.floor(firstItemIndex / pageSize) + 1;
    });
    previousPageSizeRef.current = pageSize;
  }, [pageSize]);

  const handleFilterChange = (
    key: keyof AdminUsersFilters,
    values: string[]
  ) => {
    const nextValues = (() => {
      if (key === "memberStatuses") {
        return values.filter(isMemberStatusFilterValue);
      }

      if (key === "ojPlatforms") {
        return values.filter(isOjPlatformFilterValue);
      }

      return values;
    })();

    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: nextValues,
    }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters(emptyAdminUsersFilters);
    setPage(1);
  };

  const handleSortChange = useCallback((nextSort: AdminUsersSort) => {
    setSort(nextSort);
    setPage(1);
  }, []);
  const visibleColumnControls = useColumnVisibility({
    columns: adminUsersColumns,
    storageKey: adminUsersColumnVisibilityStorageKey,
  });

  const hasActiveFilters = hasFilters(filters);
  const listInput = useMemo(
    () => ({
      filters: hasActiveFilters ? filters : undefined,
      page,
      pageSize,
      sort,
    }),
    [filters, hasActiveFilters, page, pageSize, sort]
  );
  const usersQuery = useQuery(
    trpc.admin.users.list.queryOptions(listInput, {
      enabled: Boolean(isAdmin),
      retry: false,
    })
  );
  const metadataQuery = useQuery(
    trpc.admin.users.metadata.queryOptions(undefined, {
      enabled: Boolean(isAdmin),
      retry: false,
    })
  );
  const users = usersQuery.data?.items ?? [];
  const total = usersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const shellAction = (
    <Button
      onPress={() => router.push("/admin" as Route)}
      size="sm"
      variant="outline"
    >
      <ArrowLeft className="size-4" />
      返回管理面板
    </Button>
  );

  return (
    <AppShell
      action={shellAction}
      description="管理员控制台"
      icon={<UsersRound className="size-4" />}
      title="用户列表"
    >
      <div className="grid gap-6">
        <AccessFeedback
          isAccessError={accountMe.isError}
          isCheckingAccess={isCheckingAccess}
          isMember={isMember}
          shouldPromptLogin={shouldPromptLogin}
        />

        {isAdmin ? (
          <AdminUsersTableSection
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            isFetching={usersQuery.isFetching}
            isLoadError={usersQuery.isError}
            isLoading={usersQuery.isPending}
            metadata={metadataQuery.data}
            metadataIsError={metadataQuery.isError}
            metadataIsLoading={metadataQuery.isPending}
            onClearFilters={handleClearFilters}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            page={page}
            pageSize={pageSize}
            setPage={setPage}
            sort={sort}
            tableRegionRef={tableRegionRef}
            total={total}
            totalPages={totalPages}
            users={users}
            visibleColumnControls={visibleColumnControls}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
