"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Pagination,
  Spinner,
  Table,
  Tooltip,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UsersRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
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
  isFetching: boolean;
  isLoadError: boolean;
  isLoading: boolean;
  page: number;
  pageSize: number;
  setPage: (page: number | ((currentPage: number) => number)) => void;
  tableRegionRef: (element: HTMLDivElement | null) => void;
  total: number;
  totalPages: number;
  users: AdminUserTableRow[];
}

interface AccessFeedbackProps {
  isAccessError: boolean;
  isCheckingAccess: boolean;
  isMember: boolean;
  shouldPromptLogin: boolean;
}

const clampPageSize = (pageSize: number) =>
  Math.min(maxPageSize, Math.max(minPageSize, pageSize));

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

function AdminUsersTable({
  footer,
  users,
}: {
  footer: ReactNode;
  users: AdminUserTableRow[];
}) {
  return (
    <Table variant="secondary">
      <Table.ScrollContainer>
        <Table.Content aria-label="管理员用户列表" className="min-w-[1160px]">
          <Table.Header>
            <Table.Column id="username" isRowHeader>
              用户名
            </Table.Column>
            <Table.Column id="email">邮箱</Table.Column>
            <Table.Column id="realName">姓名</Table.Column>
            <Table.Column id="grade">年级</Table.Column>
            <Table.Column id="studentId">学号</Table.Column>
            <Table.Column id="major">专业</Table.Column>
            <Table.Column id="memberStatus">状态</Table.Column>
            <Table.Column id="ojAccounts">OJ 账号</Table.Column>
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
                  <Table.Cell className="max-w-48 whitespace-nowrap font-medium">
                    <span className="block truncate">{displayUsername}</span>
                  </Table.Cell>
                  <Table.Cell className="max-w-72 whitespace-nowrap">
                    <span className="block truncate">{user.email}</span>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <ProfileValue value={user.realName} />
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <ProfileValue value={user.grade} />
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <ProfileValue mono value={user.studentId} />
                  </Table.Cell>
                  <Table.Cell className="max-w-64 whitespace-nowrap">
                    <span className="block truncate">
                      <ProfileValue value={user.major} />
                    </span>
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <MemberStatusChip status={user.memberStatus} />
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <OjAccountChips accounts={user.ojAccounts} />
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
  isFetching,
  isLoading,
  isLoadError,
  page,
  pageSize,
  setPage,
  tableRegionRef,
  total,
  totalPages,
  users,
}: AdminUsersTableSectionProps) {
  return (
    <>
      <PageHeader
        action={
          isFetching ? (
            <Chip color="warning" size="sm" variant="soft">
              刷新中
            </Chip>
          ) : (
            <Chip color="success" size="sm" variant="soft">
              管理员
            </Chip>
          )
        }
        title="用户列表"
      />

      <Card>
        <Card.Header>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Card.Description>全部账号</Card.Description>
              <Card.Title className="mt-1">{total} 个用户</Card.Title>
            </div>
            <p className="text-muted text-sm">每页 {pageSize} 条</p>
          </div>
        </Card.Header>
        <Card.Content className="grid gap-4" ref={tableRegionRef}>
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
            users={users}
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
    </>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [page, setPage] = useState(1);
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

  const listInput = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const usersQuery = useQuery(
    trpc.admin.users.list.queryOptions(listInput, {
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
            isFetching={usersQuery.isFetching}
            isLoadError={usersQuery.isError}
            isLoading={usersQuery.isPending}
            page={page}
            pageSize={pageSize}
            setPage={setPage}
            tableRegionRef={tableRegionRef}
            total={total}
            totalPages={totalPages}
            users={users}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
