"use client";

import { Alert, Chip, Spinner, Table } from "@heroui/react";
import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { ExternalLink, Trophy } from "lucide-react";
import { type Key, type ReactNode, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { getCodeforcesRatingClassName } from "@/utils/codeforces-rating";
import { trpc } from "@/utils/trpc";

const rankTableMinWidth = 1120;
const emptyText = "—";

const sortableColumns = [
  "acceptedProblemCount",
  "acceptedProblemCountInMonth",
  "lastOnlineAt",
  "maxRating",
  "rating",
] as const;

const statusConfig = {
  empty: {
    className: "bg-default text-muted",
    label: "等待刷新",
  },
  failed: {
    className: "bg-danger-soft text-danger",
    label: "刷新失败",
  },
  "missing-account": {
    className: "bg-default text-muted",
    label: "未绑定",
  },
  ready: {
    className: "bg-success-soft text-success",
    label: "已更新",
  },
  refreshing: {
    className: "bg-accent-soft text-accent",
    label: "刷新中",
  },
  stale: {
    className: "bg-warning-soft text-warning",
    label: "待刷新",
  },
} as const;

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RankRows = RouterOutputs["rank"]["codeforces"]["list"];
type RankRow = RankRows[number];
type SortColumn = (typeof sortableColumns)[number];
type SortDirection = "ascending" | "descending";
type CodeforcesStatus = keyof typeof statusConfig;

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

interface RankTableProps {
  onSortChange: (sort: SortState) => void;
  rows: RankRow[];
  sort: SortState;
}

const isSortColumn = (key: Key): key is SortColumn =>
  typeof key === "string" && sortableColumns.includes(key as SortColumn);

const getDisplayName = (row: RankRow) =>
  row.realName ?? row.displayName ?? row.username ?? "未命名用户";

const getProfileUrl = (row: RankRow) =>
  row.username ? `/profile/${encodeURIComponent(row.username)}` : null;

const getSortValue = (row: RankRow, column: SortColumn) => {
  const codeforces = row.codeforces;

  if (!codeforces) {
    return null;
  }

  if (column === "lastOnlineAt") {
    return codeforces.lastOnlineAt
      ? new Date(codeforces.lastOnlineAt).getTime()
      : null;
  }

  return codeforces[column];
};

const compareNullableNumbers = (
  left: null | number,
  right: null | number,
  direction: SortDirection
) => {
  const leftEmpty = left === null;
  const rightEmpty = right === null;

  if (leftEmpty && rightEmpty) {
    return 0;
  }

  if (leftEmpty) {
    return 1;
  }

  if (rightEmpty) {
    return -1;
  }

  const result = left - right;

  return direction === "ascending" ? result : -result;
};

const compareByName = (left: RankRow, right: RankRow) =>
  getDisplayName(left).localeCompare(getDisplayName(right), "zh-CN");

const sortRankRows = (rows: RankRow[], sort: SortState) =>
  [...rows].sort((left, right) => {
    const result = compareNullableNumbers(
      getSortValue(left, sort.column),
      getSortValue(right, sort.column),
      sort.direction
    );

    if (result !== 0) {
      return result;
    }

    return compareByName(left, right);
  });

const formatNumber = (value: null | number) =>
  value === null ? emptyText : value.toLocaleString("zh-CN");

const formatDateTime = (value: null | string) => {
  if (!value) {
    return emptyText;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date(value));
};

function RatingText({ value }: { value: null | number }) {
  return (
    <span className={`font-semibold ${getCodeforcesRatingClassName(value)}`}>
      {formatNumber(value)}
    </span>
  );
}

function EmptyCell() {
  return <span className="text-muted">{emptyText}</span>;
}

function LinkedText({
  children,
  href,
  tone = "text-accent",
}: {
  children: ReactNode;
  href: string;
  tone?: string;
}) {
  return (
    <a
      className={`inline-flex min-w-0 items-center gap-1 font-medium underline-offset-4 hover:underline focus-visible:underline ${tone}`}
      href={href}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      target={href.startsWith("http") ? "_blank" : undefined}
    >
      <span className="truncate">{children}</span>
      {href.startsWith("http") ? <ExternalLink className="size-3.5" /> : null}
    </a>
  );
}

function StatusChip({
  lastError,
  status,
}: {
  lastError?: null | string;
  status: CodeforcesStatus;
}) {
  const config = statusConfig[status];

  return (
    <Chip
      className={config.className}
      size="sm"
      title={lastError ?? undefined}
      variant="soft"
    >
      {config.label}
    </Chip>
  );
}

function RankTable({ onSortChange, rows, sort }: RankTableProps) {
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
          onSortChange={handleSortChange}
          sortDescriptor={sort}
          style={{ minWidth: rankTableMinWidth }}
        >
          <Table.Header>
            <Table.Column id="index" isRowHeader>
              序号
            </Table.Column>
            <Table.Column id="name">姓名</Table.Column>
            <Table.Column id="grade">年级</Table.Column>
            <Table.Column id="major">专业</Table.Column>
            <Table.Column id="handle">CF 账号</Table.Column>
            <Table.Column allowsSorting id="rating">
              Rating
            </Table.Column>
            <Table.Column allowsSorting id="maxRating">
              最高 Rating
            </Table.Column>
            <Table.Column allowsSorting id="acceptedProblemCount">
              AC 题数
            </Table.Column>
            <Table.Column allowsSorting id="acceptedProblemCountInMonth">
              近 30 天 AC
            </Table.Column>
            <Table.Column allowsSorting id="lastOnlineAt">
              最近活跃
            </Table.Column>
            <Table.Column id="status">数据状态</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((row, index) => {
              const codeforces = row.codeforces;
              const displayName = getDisplayName(row);
              const profileUrl = getProfileUrl(row);

              return (
                <Table.Row
                  className="h-14"
                  id={row.userId}
                  key={row.userId}
                  textValue={displayName}
                >
                  <Table.Cell className="whitespace-nowrap font-medium text-muted">
                    {index + 1}
                  </Table.Cell>
                  <Table.Cell className="min-w-36">
                    {profileUrl ? (
                      <LinkedText href={profileUrl} tone="text-foreground">
                        {displayName}
                      </LinkedText>
                    ) : (
                      displayName
                    )}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    {row.grade ?? <EmptyCell />}
                  </Table.Cell>
                  <Table.Cell className="min-w-40">
                    {row.major ?? <EmptyCell />}
                  </Table.Cell>
                  <Table.Cell className="min-w-36">
                    {codeforces ? (
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
                    ) : (
                      <EmptyCell />
                    )}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <RatingText value={codeforces?.rating ?? null} />
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <RatingText value={codeforces?.maxRating ?? null} />
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap font-semibold">
                    {formatNumber(codeforces?.acceptedProblemCount ?? null)}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap font-semibold">
                    {formatNumber(
                      codeforces?.acceptedProblemCountInMonth ?? null
                    )}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    {formatDateTime(codeforces?.lastOnlineAt ?? null)}
                  </Table.Cell>
                  <Table.Cell className="whitespace-nowrap">
                    <StatusChip
                      lastError={codeforces?.lastError}
                      status={codeforces?.status ?? "missing-account"}
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export default function CodeforcesRankPage() {
  const [sort, setSort] = useState<SortState>({
    column: "rating",
    direction: "descending",
  });
  const rankQuery = useQuery(trpc.rank.codeforces.list.queryOptions());
  const rows = useMemo(
    () => sortRankRows(rankQuery.data ?? [], sort),
    [rankQuery.data, sort]
  );

  return (
    <AppShell
      description="队内成员 Codeforces 数据"
      icon={<Trophy className="size-4" />}
      title="Codeforces 排行榜"
    >
      <div className="grid gap-4">
        {rankQuery.isPending ? (
          <div className="flex items-center gap-3">
            <Spinner color="current" size="sm" />
            <p className="font-medium">正在读取排行榜。</p>
          </div>
        ) : null}

        {rankQuery.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>排行榜加载失败</Alert.Title>
              <Alert.Description>请刷新页面后重试。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {rankQuery.isSuccess && rows.length === 0 ? (
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>暂无用户。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {rows.length > 0 ? (
          <RankTable onSortChange={setSort} rows={rows} sort={sort} />
        ) : null}
      </div>
    </AppShell>
  );
}
