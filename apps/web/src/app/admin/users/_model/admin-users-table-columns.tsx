"use client";

import { Button, Chip, Tooltip } from "@heroui/react";
import {
  type MemberStatus,
  memberStatusLabels,
  ojPlatformLabels,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import clsx from "clsx";
import { Pencil, Trash2 } from "lucide-react";
import type { Key, ReactNode } from "react";

import type { TableColumnVisibilityConfig } from "@/components/column-visibility";
import { getProfileDisplayValue } from "@/utils/profile-fields";
import {
  type AdminUserOjAccount,
  type AdminUserTableRow,
  getAdminUsernameLabel,
  type SortColumn,
  type UserRole,
} from "../helpers";

export const adminUsersColumnVisibilityStorageKey =
  "admin-users-column-visibility-v1";

export type AdminUsersColumnId =
  | "email"
  | "grade"
  | "major"
  | "memberStatus"
  | "ojAccounts"
  | "realName"
  | "studentId"
  | "username";

type AdminUsersDisplayColumnId = "actions" | "sequence" | AdminUsersColumnId;
type AdminUsersColumnAlign = "center" | "end" | "start";
type AdminUsersColumnVisibility = "default" | "fixed" | "optional" | "required";

export interface AdminUsersColumnConfig
  extends TableColumnVisibilityConfig<AdminUsersColumnId> {}

export interface AdminUsersVisibleColumnControls {
  resetColumns: () => void;
  setColumnVisible: (columnId: AdminUsersColumnId, isVisible: boolean) => void;
  visibleColumnIds: readonly AdminUsersColumnId[];
  visibleColumns: readonly AdminUsersColumnConfig[];
}

export interface AdminUsersTableActions {
  onDeleteUser: (user: AdminUserTableRow) => void;
  onEditUser: (user: AdminUserTableRow) => void;
}

interface AdminUsersCellContext {
  actions: AdminUsersTableActions;
  row: AdminUserTableRow;
  rowIndex: number;
}

export interface AdminUsersDisplayColumn {
  align: AdminUsersColumnAlign;
  cellClassName?: string;
  headerClassName?: string;
  id: AdminUsersDisplayColumnId;
  isRowHeader?: boolean;
  label: string;
  minWidth: number;
  renderCell: (context: AdminUsersCellContext) => ReactNode;
  sortColumn?: SortColumn;
  visibility: AdminUsersColumnVisibility;
}

const memberStatusConfig = {
  active: {
    color: "success",
  },
  frozen: {
    color: "danger",
  },
  retired: {
    color: "default",
  },
  selection: {
    color: "accent",
  },
} as const satisfies Record<
  MemberStatus,
  { color: "accent" | "danger" | "default" | "success" }
>;

function MemberStatusChip({ status }: { status: MemberStatus }) {
  const config = memberStatusConfig[status];

  return (
    <Chip color={config.color} size="sm" variant="soft">
      {memberStatusLabels[status]}
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
}: {
  memberStatus: MemberStatus;
  onDelete: () => void;
  onEdit: () => void;
  role: UserRole;
}) {
  const isAdminUser = role === "admin";
  const isFrozenUser = memberStatus === "frozen";
  const canDelete = !isAdminUser && isFrozenUser;
  const deleteLabel = (() => {
    if (isAdminUser) {
      return "管理员账户不能在面板删除";
    }

    if (!isFrozenUser) {
      return "只有已冻结用户才能删除";
    }

    return "删除用户";
  })();

  return (
    <div className="flex min-h-7 items-center justify-center gap-1">
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

const renderProfileValue = (value: null | string | undefined) => (
  <ProfileValue value={value} />
);

const renderTruncatedProfileValue = (value: null | string | undefined) => (
  <span className="block truncate">
    <ProfileValue value={value} />
  </span>
);

export const adminUsersDisplayColumns: readonly AdminUsersDisplayColumn[] = [
  {
    align: "center",
    cellClassName: "font-mono text-muted text-sm tabular-nums",
    id: "sequence",
    label: "序号",
    minWidth: 64,
    renderCell: ({ rowIndex }) => rowIndex + 1,
    visibility: "fixed",
  },
  {
    align: "start",
    cellClassName: "font-medium",
    id: "username",
    isRowHeader: true,
    label: "用户名",
    minWidth: 176,
    renderCell: ({ row }) => (
      <span className="block truncate">{getAdminUsernameLabel(row)}</span>
    ),
    sortColumn: "username",
    visibility: "required",
  },
  {
    align: "center",
    id: "realName",
    label: "姓名",
    minWidth: 112,
    renderCell: ({ row }) => renderProfileValue(row.realName),
    sortColumn: "realName",
    visibility: "default",
  },
  {
    align: "center",
    id: "memberStatus",
    label: "状态",
    minWidth: 104,
    renderCell: ({ row }) => <MemberStatusChip status={row.memberStatus} />,
    sortColumn: "memberStatus",
    visibility: "default",
  },
  {
    align: "center",
    id: "grade",
    label: "年级",
    minWidth: 88,
    renderCell: ({ row }) => renderProfileValue(row.grade),
    sortColumn: "grade",
    visibility: "default",
  },
  {
    align: "start",
    id: "studentId",
    label: "学号",
    minWidth: 128,
    renderCell: ({ row }) => <ProfileValue mono value={row.studentId} />,
    sortColumn: "studentId",
    visibility: "optional",
  },
  {
    align: "start",
    id: "major",
    label: "专业",
    minWidth: 200,
    renderCell: ({ row }) => renderTruncatedProfileValue(row.major),
    sortColumn: "major",
    visibility: "optional",
  },
  {
    align: "start",
    id: "ojAccounts",
    label: "OJ 账号",
    minWidth: 216,
    renderCell: ({ row }) => <OjAccountChips accounts={row.ojAccounts} />,
    visibility: "default",
  },
  {
    align: "start",
    id: "email",
    label: "邮箱",
    minWidth: 240,
    renderCell: ({ row }) => (
      <span className="block truncate">{row.email}</span>
    ),
    sortColumn: "email",
    visibility: "default",
  },
  {
    align: "center",
    id: "actions",
    label: "操作",
    minWidth: 96,
    renderCell: ({ actions, row }) => (
      <AdminUserActionsCell
        memberStatus={row.memberStatus}
        onDelete={() => actions.onDeleteUser(row)}
        onEdit={() => actions.onEditUser(row)}
        role={row.role}
      />
    ),
    visibility: "fixed",
  },
] as const;

const isConfigurableColumn = (
  column: AdminUsersDisplayColumn
): column is AdminUsersDisplayColumn & {
  id: AdminUsersColumnId;
  visibility: Exclude<AdminUsersColumnVisibility, "fixed">;
} => column.visibility !== "fixed";

export const adminUsersColumns = adminUsersDisplayColumns
  .filter(isConfigurableColumn)
  .map((column) => ({
    defaultVisible:
      column.visibility === "default" || column.visibility === "required",
    id: column.id,
    label: column.label,
    required: column.visibility === "required",
  })) satisfies readonly AdminUsersColumnConfig[];

export const getVisibleAdminUsersDisplayColumns = (
  visibleColumnIds: readonly AdminUsersColumnId[]
) => {
  const visibleColumnIdSet = new Set(visibleColumnIds);

  return adminUsersDisplayColumns.filter(
    (column) =>
      column.visibility === "fixed" ||
      (isConfigurableColumn(column) && visibleColumnIdSet.has(column.id))
  );
};

export const getAdminUsersTableMinWidth = (
  columns: readonly AdminUsersDisplayColumn[]
) => {
  let minWidth = 0;

  for (const column of columns) {
    minWidth += column.minWidth;
  }

  return Math.max(720, minWidth);
};

export const isAdminUsersSortColumn = (key: Key): key is SortColumn =>
  typeof key === "string" &&
  adminUsersDisplayColumns.some((column) => column.sortColumn === key);

export const getFirstVisibleAdminUsersSortColumn = (
  visibleColumnIds: readonly AdminUsersColumnId[]
) => {
  for (const column of getVisibleAdminUsersDisplayColumns(visibleColumnIds)) {
    if (column.sortColumn) {
      return column.sortColumn;
    }
  }

  return null;
};
