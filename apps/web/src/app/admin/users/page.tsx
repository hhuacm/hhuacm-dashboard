"use client";

import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Chip,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Pagination,
  Popover,
  Select,
  Spinner,
  Table,
  TextField,
  Tooltip,
} from "@heroui/react";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
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
import { DirtyFieldLabel } from "@/components/dirty-field-label";
import { authClient } from "@/utils/auth-client";
import {
  buildProfileFormValues,
  emptyProfileFormValues,
  getChangedProfileValues,
  getGradeOptionsWithCurrentValue,
  getProfileDisplayValue,
  hasProfileUpdateValues,
  type ProfileFieldKey,
  type ProfileFormValues,
  type ProfileUpdateValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";
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
const adminUsersActionsColumnMinWidth = 112;
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
type UserRole = "admin" | "member";
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

interface AdminUserProfile {
  grade: null | string;
  major: null | string;
  memberStatus: MemberStatus;
  realName: null | string;
  studentId: null | string;
}

interface AdminUserDetail {
  displayUsername: null | string;
  email: string;
  id: string;
  name: string;
  ojAccounts: AdminUserOjAccount[];
  profile: AdminUserProfile;
  role: UserRole;
  username: null | string;
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
  role: UserRole;
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

interface AdminUserActionsCellProps {
  memberStatus: string;
  onDelete: () => void;
  onEdit: () => void;
  role: UserRole;
  username: null | string;
}

interface AdminUserDeleteDialogProps {
  confirmationValue: string;
  errorMessage: null | string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onConfirmationChange: (value: string) => void;
  user: AdminUserTableRow | null;
}

interface AdminUserEditDialogProps {
  listQueryKey: QueryKey;
  onClose: () => void;
  user: AdminUserTableRow | null;
}

interface AdminUserBasicInfoEditorProps {
  detail: AdminUserDetail | undefined;
  isLoading: boolean;
  listQueryKey: QueryKey;
  userId: string;
}

interface AdminUserOjAccountEditorProps {
  accounts: AdminUserOjAccount[];
  isLoading: boolean;
  listQueryKey: QueryKey;
  userId: string;
}

interface AdminUserOjAccountRowProps {
  account: AdminUserOjAccount | undefined;
  isLoading: boolean;
  listQueryKey: QueryKey;
  platform: OjPlatform;
  userId: string;
}

interface AdminUserOjAccountDeleteDialogProps {
  account: AdminUserOjAccount | undefined;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  platform: OjPlatform | null;
}

interface EditorMessage {
  text: string;
  tone: "danger" | "success";
}

type AdminProfileFormValues = ProfileFormValues & {
  memberStatus: MemberStatus;
};

type AdminProfileUpdateValues = ProfileUpdateValues & {
  memberStatus?: MemberStatus;
};

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

  return Math.max(720, minWidth + adminUsersActionsColumnMinWidth);
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

const getAdminDetailDisplayUsername = (
  user: AdminUserDetail | AdminUserTableRow | null | undefined
) => {
  if (!user) {
    return "未设置";
  }

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

const getErrorText = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }

  const message = Reflect.get(error, "message");

  return typeof message === "string" ? message : "";
};

const getAdminEditErrorMessage = (error: unknown) => {
  const errorText = getErrorText(error);

  if (errorText.includes("OJ handle already exists")) {
    return "该平台账号已被其他用户登记。";
  }

  if (errorText.includes("OJ account does not exist")) {
    return "该平台尚未登记。";
  }

  if (errorText.includes("User does not exist")) {
    return "用户不存在，请刷新列表后重试。";
  }

  if (errorText.includes("Admin users cannot be deleted")) {
    return "管理员账户不能在面板删除。";
  }

  if (errorText.includes("Only frozen users can be deleted")) {
    return "只有已冻结用户才能删除。";
  }

  if (errorText.includes("Username confirmation does not match")) {
    return "用户名确认不匹配。";
  }

  if (errorText.includes("Invalid grade")) {
    return "年级不在可选范围内。";
  }

  return "操作失败，请稍后再试。";
};

const buildAdminProfileFormValues = (
  profile: AdminUserProfile | undefined
): AdminProfileFormValues => ({
  ...buildProfileFormValues(profile),
  memberStatus: profile?.memberStatus ?? "selection",
});

const getChangedAdminProfileValues = (
  currentValues: AdminProfileFormValues,
  originalValues: AdminProfileFormValues
) => {
  const changedValues: AdminProfileUpdateValues = {
    ...getChangedProfileValues(currentValues, originalValues),
  };

  if (currentValues.memberStatus !== originalValues.memberStatus) {
    changedValues.memberStatus = currentValues.memberStatus;
  }

  return changedValues;
};

const hasAdminProfileUpdateValues = (values: AdminProfileUpdateValues) =>
  "memberStatus" in values || hasProfileUpdateValues(values);

const getOjAccountByPlatform = (
  accounts: AdminUserOjAccount[],
  platform: OjPlatform
) => accounts.find((account) => account.platform === platform);

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

function AdminUserDeleteDialog({
  confirmationValue,
  errorMessage,
  isDeleting,
  onCancel,
  onConfirm,
  onConfirmationChange,
  user,
}: AdminUserDeleteDialogProps) {
  const username = user?.username ?? "";
  const isConfirmationMatched = confirmationValue === username;
  const canConfirm = Boolean(user) && isConfirmationMatched && !isDeleting;

  return (
    <AlertDialog.Backdrop
      isOpen={Boolean(user)}
      onOpenChange={(isOpen) => {
        if (!(isOpen || isDeleting)) {
          onCancel();
        }
      }}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-110">
          <AlertDialog.CloseTrigger isDisabled={isDeleting} />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger">
              <Trash2 className="size-5" />
            </AlertDialog.Icon>
            <AlertDialog.Heading>删除用户？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="px-0.5 pt-3 pb-0.5">
            <div className="grid gap-4">
              <p className="text-sm">
                用户一旦删除便无法恢复。请完整输入用户名：
                <span className="font-mono font-semibold">{username}</span>
              </p>
              <TextField
                autoFocus
                fullWidth
                isDisabled={isDeleting}
                name="username-confirmation"
                onChange={onConfirmationChange}
                value={confirmationValue}
              >
                <Label>注册用户名</Label>
                <Input autoComplete="off" variant="secondary" />
              </TextField>
              {errorMessage ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{errorMessage}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
            </div>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={isDeleting}
              onPress={onCancel}
              variant="tertiary"
            >
              取消
            </Button>
            <Button
              isDisabled={!canConfirm}
              isPending={isDeleting}
              onPress={onConfirm}
              variant="danger"
            >
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {isPending ? "删除中" : "删除"}
                </>
              )}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

function AdminUserBasicInfoEditor({
  detail,
  isLoading,
  listQueryKey,
  userId,
}: AdminUserBasicInfoEditorProps) {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<AdminProfileFormValues>({
    ...emptyProfileFormValues,
    memberStatus: "selection",
  });
  const [originalFormValues, setOriginalFormValues] =
    useState<AdminProfileFormValues>({
      ...emptyProfileFormValues,
      memberStatus: "selection",
    });
  const [message, setMessage] = useState<EditorMessage | null>(null);

  useEffect(() => {
    const nextValues = buildAdminProfileFormValues(detail?.profile);
    setFormValues(nextValues);
    setOriginalFormValues(nextValues);
    setMessage(null);
  }, [detail?.profile]);

  const changedValues = getChangedAdminProfileValues(
    formValues,
    originalFormValues
  );
  const hasChanges = hasAdminProfileUpdateValues(changedValues);
  const gradeOptions = getGradeOptionsWithCurrentValue(
    originalFormValues.grade
  );
  const updateProfile = useMutation(
    trpc.admin.users.updateProfile.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.admin.users.get.queryKey({ userId }),
          }),
          queryClient.invalidateQueries({ queryKey: listQueryKey }),
        ]);
        setMessage({
          text: "基础信息已保存。",
          tone: "success",
        });
      },
    })
  );

  const handleInputChange = (field: ProfileFieldKey, value: string) => {
    setMessage(null);
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };
  const handleStatusChange = (key: Key | null) => {
    if (!(typeof key === "string" && isMemberStatus(key))) {
      return;
    }

    setMessage(null);
    setFormValues((currentValues) => ({
      ...currentValues,
      memberStatus: key,
    }));
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!hasAdminProfileUpdateValues(changedValues)) {
      setMessage({
        text: "没有需要保存的修改。",
        tone: "success",
      });
      return;
    }

    await updateProfile.mutateAsync({
      userId,
      values: changedValues,
    });
  };

  return (
    <section className="grid gap-4 border-border border-b pb-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-base">基础信息</h3>
          <p className="text-muted text-sm">状态、姓名、年级、学号和专业。</p>
        </div>
        {isLoading ? (
          <span className="inline-flex items-center gap-2 text-muted text-sm">
            <Spinner color="current" size="sm" />
            正在读取
          </span>
        ) : null}
      </div>

      {message ? (
        <Alert status={message.tone}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 px-0.5 pt-3 pb-0.5 sm:grid-cols-2">
          <Select
            fullWidth
            isDisabled={isLoading || updateProfile.isPending}
            onSelectionChange={handleStatusChange}
            selectedKey={formValues.memberStatus}
            variant="secondary"
          >
            <DirtyFieldLabel
              isChanged={"memberStatus" in changedValues}
              label="状态"
            />
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {Object.entries(memberStatusConfig).map(([status, config]) => (
                  <ListBox.Item
                    id={status}
                    key={status}
                    textValue={config.label}
                  >
                    {config.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {profileFieldConfigs.map((field) =>
            field.key === "grade" ? (
              <Select
                fullWidth
                isDisabled={isLoading || updateProfile.isPending}
                key={field.key}
                onSelectionChange={(key) =>
                  handleInputChange(
                    field.key,
                    typeof key === "string" ? key : ""
                  )
                }
                placeholder="未填写"
                selectedKey={formValues.grade || null}
                variant="secondary"
              >
                <DirtyFieldLabel
                  isChanged={field.key in changedValues}
                  label={field.label}
                />
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="" textValue="未填写">
                      未填写
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {gradeOptions.map((option) => (
                      <ListBox.Item id={option} key={option} textValue={option}>
                        {option}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            ) : (
              <TextField
                fullWidth
                isDisabled={isLoading || updateProfile.isPending}
                key={field.key}
                name={field.key}
                onChange={(nextValue) =>
                  handleInputChange(field.key, nextValue)
                }
                value={formValues[field.key]}
              >
                <DirtyFieldLabel
                  isChanged={field.key in changedValues}
                  label={field.label}
                />
                <Input
                  autoComplete={field.autoComplete}
                  placeholder="未填写"
                  variant="secondary"
                />
              </TextField>
            )
          )}
        </div>
        <div className="flex justify-end">
          <Button
            isDisabled={isLoading || !hasChanges}
            isPending={updateProfile.isPending}
            type="submit"
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Save className="size-4" />
                )}
                {isPending ? "保存中" : "保存基础信息"}
              </>
            )}
          </Button>
        </div>
      </Form>
    </section>
  );
}

function AdminUserOjAccountDeleteDialog({
  account,
  isDeleting,
  onCancel,
  onConfirm,
  platform,
}: AdminUserOjAccountDeleteDialogProps) {
  const platformLabel = platform ? ojPlatformLabels[platform] : "";

  return (
    <AlertDialog.Backdrop
      isOpen={Boolean(platform && account)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel();
        }
      }}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-110">
          <AlertDialog.CloseTrigger isDisabled={isDeleting} />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger">
              <Trash2 className="size-5" />
            </AlertDialog.Icon>
            <AlertDialog.Heading>删除 OJ 账号？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p className="text-sm">
              将删除 {platformLabel} 账号
              <span className="font-mono font-semibold">
                {account ? ` ${account.handle}` : ""}
              </span>
              。
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={isDeleting}
              onPress={onCancel}
              variant="tertiary"
            >
              取消
            </Button>
            <Button isPending={isDeleting} onPress={onConfirm} variant="danger">
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {isPending ? "删除中" : "删除"}
                </>
              )}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

function AdminUserOjAccountRow({
  account,
  isLoading,
  listQueryKey,
  platform,
  userId,
}: AdminUserOjAccountRowProps) {
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState(account?.handle ?? "");
  const [message, setMessage] = useState<EditorMessage | null>(null);
  const [deleteTargetPlatform, setDeleteTargetPlatform] =
    useState<OjPlatform | null>(null);

  useEffect(() => {
    setHandle(account?.handle ?? "");
    setMessage(null);
  }, [account?.handle]);

  const invalidateUserData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.admin.users.get.queryKey({ userId }),
      }),
      queryClient.invalidateQueries({ queryKey: listQueryKey }),
    ]);
  };
  const upsertAccount = useMutation(
    trpc.admin.users.upsertOjAccount.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateUserData();
        setMessage({
          text: account ? "OJ 账号已更新。" : "OJ 账号已添加。",
          tone: "success",
        });
      },
    })
  );
  const deleteAccount = useMutation(
    trpc.admin.users.deleteOjAccount.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateUserData();
        setDeleteTargetPlatform(null);
        setMessage({
          text: "OJ 账号已删除。",
          tone: "success",
        });
      },
    })
  );
  const normalizedHandle = handle.trim();
  const isChanged = normalizedHandle !== (account?.handle ?? "");
  const canSave = Boolean(normalizedHandle) && isChanged;
  const isBusy = upsertAccount.isPending || deleteAccount.isPending;
  const platformLabel = ojPlatformLabels[platform];
  const saveIcon = account ? (
    <Save className="size-4" />
  ) : (
    <Plus className="size-4" />
  );
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!canSave) {
      setMessage({
        text: normalizedHandle ? "没有需要保存的修改。" : "请填写账号昵称。",
        tone: normalizedHandle ? "success" : "danger",
      });
      return;
    }

    await upsertAccount.mutateAsync({
      handle: normalizedHandle,
      platform,
      userId,
    });
  };
  const handleDeleteConfirm = async () => {
    if (!deleteTargetPlatform) {
      return;
    }

    await deleteAccount.mutateAsync({
      platform: deleteTargetPlatform,
      userId,
    });
  };

  return (
    <div className="grid gap-2 rounded-md border border-border px-3 py-3">
      <Form
        className="grid gap-3 md:grid-cols-[7rem_minmax(0,1fr)_auto]"
        onSubmit={handleSubmit}
      >
        <div className="flex min-h-10 items-center">
          <Chip
            color={account ? "success" : "default"}
            size="sm"
            variant="soft"
          >
            {platformLabel}
          </Chip>
        </div>
        <TextField
          fullWidth
          isDisabled={isLoading || isBusy}
          name={`${platform}-handle`}
          onChange={(nextValue) => {
            setMessage(null);
            setHandle(nextValue);
          }}
          value={handle}
        >
          <DirtyFieldLabel isChanged={isChanged} label="账号昵称" />
          <Input autoComplete="off" placeholder="未登记" variant="secondary" />
        </TextField>
        <div className="flex items-end gap-2">
          <Button
            isDisabled={isLoading || !canSave || deleteAccount.isPending}
            isPending={upsertAccount.isPending}
            type="submit"
            variant={account ? "secondary" : undefined}
          >
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : saveIcon}
                {account ? "保存" : "添加"}
              </>
            )}
          </Button>
          <Button
            isDisabled={isLoading || !account || upsertAccount.isPending}
            onPress={() => setDeleteTargetPlatform(platform)}
            variant="danger"
          >
            <Trash2 className="size-4" />
            删除
          </Button>
        </div>
      </Form>
      {message ? (
        <Alert status={message.tone}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <AdminUserOjAccountDeleteDialog
        account={account}
        isDeleting={deleteAccount.isPending}
        onCancel={() => {
          if (!deleteAccount.isPending) {
            setDeleteTargetPlatform(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        platform={deleteTargetPlatform}
      />
    </div>
  );
}

function AdminUserOjAccountEditor({
  accounts,
  isLoading,
  listQueryKey,
  userId,
}: AdminUserOjAccountEditorProps) {
  return (
    <section className="grid gap-4">
      <div>
        <h3 className="font-semibold text-base">OJ 账号</h3>
        <p className="text-muted text-sm">每个平台账号独立保存。</p>
      </div>
      <div className="grid gap-3">
        {ojPlatformOrder.map((platform) => (
          <AdminUserOjAccountRow
            account={getOjAccountByPlatform(accounts, platform)}
            isLoading={isLoading}
            key={platform}
            listQueryKey={listQueryKey}
            platform={platform}
            userId={userId}
          />
        ))}
      </div>
    </section>
  );
}

function AdminUserEditDialog({
  listQueryKey,
  onClose,
  user,
}: AdminUserEditDialogProps) {
  const userId = user?.id ?? "";
  const detailQuery = useQuery(
    trpc.admin.users.get.queryOptions(
      { userId },
      {
        enabled: Boolean(userId),
        retry: false,
      }
    )
  );
  const detail = detailQuery.data;
  const displayUsername = getAdminDetailDisplayUsername(detail ?? user);
  const isOpen = Boolean(user);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(isNextOpen) => {
        if (!isNextOpen) {
          onClose();
        }
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-190">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-default">
              <Pencil className="size-5 text-accent" />
            </Modal.Icon>
            <div>
              <Modal.Heading>编辑用户</Modal.Heading>
              <p className="mt-1 text-muted text-sm">{displayUsername}</p>
            </div>
          </Modal.Header>
          <Modal.Body className="grid max-h-[72vh] gap-5 overflow-y-auto px-0.5 pt-3 pb-0.5">
            <div className="grid gap-2 rounded-md border border-border bg-surface px-3 py-3 text-sm sm:grid-cols-3">
              <div>
                <span className="text-muted">注册用户名</span>
                <p className="mt-1 break-all font-mono">
                  {detail?.username ?? user?.username ?? "未设置"}
                </p>
              </div>
              <div>
                <span className="text-muted">邮箱</span>
                <p className="mt-1 break-all">
                  {detail?.email ?? user?.email ?? "未填写"}
                </p>
              </div>
              <div>
                <span className="text-muted">显示名</span>
                <p className="mt-1 break-all">{displayUsername}</p>
              </div>
            </div>

            {detailQuery.isPending ? (
              <Alert>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>正在读取用户信息。</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            {detailQuery.isError ? (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    用户信息加载失败，请刷新列表后重试。
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <AdminUserBasicInfoEditor
              detail={detail}
              isLoading={detailQuery.isPending}
              listQueryKey={listQueryKey}
              userId={userId}
            />
            <AdminUserOjAccountEditor
              accounts={detail?.ojAccounts ?? []}
              isLoading={detailQuery.isPending}
              listQueryKey={listQueryKey}
              userId={userId}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button onPress={onClose} variant="secondary">
              关闭
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
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

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const targetUsername = searchParams.get("username");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AdminUsersFilters>(
    emptyAdminUsersFilters
  );
  const [sort, setSort] = useState<AdminUsersSort>({
    column: "username",
    direction: "ascending",
  });
  const [editTargetUser, setEditTargetUser] =
    useState<AdminUserTableRow | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] =
    useState<AdminUserTableRow | null>(null);
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null
  );
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
  const handleEditUser = (nextUser: AdminUserTableRow) => {
    setEditTargetUser(nextUser);
  };
  const closeEditDialog = () => {
    setEditTargetUser(null);
  };
  const handleDeleteUser = (nextUser: AdminUserTableRow) => {
    if (
      !(
        nextUser.username &&
        nextUser.role !== "admin" &&
        nextUser.memberStatus === "frozen"
      )
    ) {
      return;
    }

    setDeleteTargetUser(nextUser);
    setDeleteConfirmationValue("");
    setDeleteErrorMessage(null);
  };
  const closeDeleteDialog = () => {
    setDeleteTargetUser(null);
    setDeleteConfirmationValue("");
    setDeleteErrorMessage(null);
  };
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
  const listQueryKey = trpc.admin.users.list.queryKey(listInput);
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
  const deleteUser = useMutation(
    trpc.admin.users.delete.mutationOptions({
      onError: (error) => {
        setDeleteErrorMessage(getAdminEditErrorMessage(error));
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: listQueryKey });
        closeDeleteDialog();
      },
    })
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTargetUser) {
      return;
    }

    setDeleteErrorMessage(null);
    await deleteUser.mutateAsync({
      userId: deleteTargetUser.id,
      usernameConfirmation: deleteConfirmationValue,
    });
  };

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!(targetUsername && isAdmin && !usersQuery.isPending)) {
      return;
    }

    const targetUser = users.find(
      (currentUser) => currentUser.username === targetUsername
    );

    if (targetUser) {
      setEditTargetUser(targetUser);
    }
  }, [isAdmin, targetUsername, users, usersQuery.isPending]);

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
            onDeleteUser={handleDeleteUser}
            onEditUser={handleEditUser}
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

        <AdminUserDeleteDialog
          confirmationValue={deleteConfirmationValue}
          errorMessage={deleteErrorMessage}
          isDeleting={deleteUser.isPending}
          onCancel={closeDeleteDialog}
          onConfirm={handleDeleteConfirm}
          onConfirmationChange={(value) => {
            setDeleteErrorMessage(null);
            setDeleteConfirmationValue(value);
          }}
          user={deleteTargetUser}
        />
        <AdminUserEditDialog
          listQueryKey={listQueryKey}
          onClose={closeEditDialog}
          user={editTargetUser}
        />
      </div>
    </AppShell>
  );
}
