"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Chip,
  Input,
  Label,
  Popover,
  Spinner,
  Table,
  TextField,
} from "@heroui/react";
import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
  Trophy,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type Key,
  type ReactNode,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import {
  ColumnVisibilityMenu,
  type TableColumnVisibilityConfig,
  useColumnVisibility,
} from "@/components/column-visibility";
import { getCodeforcesRatingClassName } from "@/utils/codeforces-rating";
import { trpc } from "@/utils/trpc";

const emptyText = "—";

const sortableColumns = [
  "acceptedProblemCount",
  "acceptedProblemCountInMonth",
  "lastOnlineAt",
  "maxRating",
  "rating",
] as const;
const numberFilterConfigs = [
  {
    key: "rating",
    label: "Rating",
    placeholder: "Rating ≥",
  },
  {
    key: "maxRating",
    label: "最高 Rating",
    placeholder: "最高 Rating ≥",
  },
  {
    key: "acceptedProblemCount",
    label: "AC 题数",
    placeholder: "AC 题数 ≥",
  },
  {
    key: "acceptedProblemCountInMonth",
    label: "近 30 天 AC",
    placeholder: "近 30 天 AC ≥",
  },
] as const;
const minuteSeconds = 60;
const hourSeconds = 60 * minuteSeconds;
const daySeconds = 24 * hourSeconds;
const weekSeconds = 7 * daySeconds;
const monthSeconds = 30 * daySeconds;
const yearSeconds = 365 * daySeconds;
const dormantSeconds = 30 * daySeconds;
const rankTableMinWidth = 720;
const filterSearchThreshold = 8;
const rankColumnVisibilityStorageKey = "rank-codeforces-column-visibility-v1";
const rankTableColumnClassName = "whitespace-nowrap text-center font-bold";
const rankTableCellClassName = "text-center";

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
type NumberFilterKey = (typeof numberFilterConfigs)[number]["key"];
type SortDirection = "ascending" | "descending";
type CodeforcesStatus = keyof typeof statusConfig;
type RankColumnId =
  | "acceptedProblemCount"
  | "acceptedProblemCountInMonth"
  | "grade"
  | "handle"
  | "index"
  | "lastOnlineAt"
  | "major"
  | "maxRating"
  | "name"
  | "rating"
  | "status";

interface RankColumnConfig extends TableColumnVisibilityConfig<RankColumnId> {
  cellClassName?: string;
  minWidth: number;
}

interface SortState {
  column: SortColumn;
  direction: SortDirection;
}

interface FilterOption {
  label: string;
  value: string;
}

interface RankFilters {
  grades: string[];
  majors: string[];
  minimums: Record<NumberFilterKey, string>;
}

interface RankTableProps {
  onSortChange: (sort: SortState) => void;
  rows: RankRow[];
  sort: SortState;
  visibleColumns: readonly RankColumnConfig[];
}

interface RankToolbarProps {
  filters: RankFilters;
  gradeOptions: FilterOption[];
  hasActiveFilters: boolean;
  majorOptions: FilterOption[];
  onClearFilters: () => void;
  onFilterChange: (key: "grades" | "majors", values: string[]) => void;
  onMinimumFilterChange: (key: NumberFilterKey, value: string) => void;
  onResetColumns: () => void;
  onVisibleColumnChange: (columnId: RankColumnId, isVisible: boolean) => void;
  visibleColumnIds: readonly RankColumnId[];
}

interface FilterMenuProps {
  label: string;
  onChange: (values: string[]) => void;
  options: FilterOption[];
  selectedValues: string[];
}

interface NumberFilterMenuProps {
  minimums: Record<NumberFilterKey, string>;
  onChange: (key: NumberFilterKey, value: string) => void;
}

const emptyRankFilters: RankFilters = {
  grades: [],
  majors: [],
  minimums: {
    acceptedProblemCount: "",
    acceptedProblemCountInMonth: "",
    maxRating: "",
    rating: "",
  },
};

const rankColumns = [
  {
    cellClassName: "whitespace-nowrap font-medium text-muted",
    defaultVisible: true,
    id: "index",
    label: "序号",
    minWidth: 56,
    required: true,
  },
  {
    cellClassName: "max-w-36 whitespace-nowrap",
    defaultVisible: true,
    id: "name",
    label: "姓名",
    minWidth: 96,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "grade",
    label: "年级",
    minWidth: 80,
  },
  {
    cellClassName: "max-w-48 whitespace-nowrap",
    defaultVisible: true,
    id: "major",
    label: "专业",
    minWidth: 128,
  },
  {
    cellClassName: "max-w-44 whitespace-nowrap",
    defaultVisible: true,
    id: "handle",
    label: "CF 账号",
    minWidth: 128,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "rating",
    label: "Rating",
    minWidth: 88,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "maxRating",
    label: "最高 Rating",
    minWidth: 112,
  },
  {
    cellClassName: "whitespace-nowrap font-semibold",
    defaultVisible: true,
    id: "acceptedProblemCount",
    label: "AC 题数",
    minWidth: 96,
  },
  {
    cellClassName: "whitespace-nowrap font-semibold",
    defaultVisible: true,
    id: "acceptedProblemCountInMonth",
    label: "近 30 天 AC",
    minWidth: 112,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: true,
    id: "lastOnlineAt",
    label: "最近活跃",
    minWidth: 160,
  },
  {
    cellClassName: "whitespace-nowrap",
    defaultVisible: false,
    id: "status",
    label: "数据状态",
    minWidth: 96,
  },
] as const satisfies readonly RankColumnConfig[];

const isSortColumn = (key: Key): key is SortColumn =>
  typeof key === "string" && sortableColumns.includes(key as SortColumn);

const isRankSortColumn = (columnId: RankColumnId): columnId is SortColumn =>
  sortableColumns.includes(columnId as SortColumn);

const getVisibleTableMinWidth = (columns: readonly RankColumnConfig[]) => {
  let minWidth = 0;

  for (const column of columns) {
    minWidth += column.minWidth;
  }

  return Math.max(rankTableMinWidth, minWidth);
};

const getRankFilterOptions = (
  rows: readonly RankRow[],
  key: "grade" | "major"
) => {
  const values = new Set<string>();

  for (const row of rows) {
    const value = row[key]?.trim();

    if (value) {
      values.add(value);
    }
  }

  return [...values]
    .sort((left, right) =>
      left.localeCompare(right, "zh-CN", { numeric: true })
    )
    .map((value) => ({ label: value, value }));
};

const parseMinimumFilterValue = (value: string) => {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const hasMinimumValue = (
  value: null | number | undefined,
  minimum: null | number
) =>
  minimum === null ||
  (value !== null && value !== undefined && value >= minimum);

const hasActiveRankFilters = (filters: RankFilters) =>
  filters.grades.length > 0 ||
  filters.majors.length > 0 ||
  numberFilterConfigs.some(({ key }) => filters.minimums[key].trim());

const getActiveNumberFilterCount = (
  minimums: Record<NumberFilterKey, string>
) =>
  numberFilterConfigs.filter(({ key }) => minimums[key].trim().length > 0)
    .length;

const filterRankRows = (rows: readonly RankRow[], filters: RankFilters) => {
  const selectedGrades = new Set(filters.grades);
  const selectedMajors = new Set(filters.majors);
  const minimumValues = {
    acceptedProblemCount: parseMinimumFilterValue(
      filters.minimums.acceptedProblemCount
    ),
    acceptedProblemCountInMonth: parseMinimumFilterValue(
      filters.minimums.acceptedProblemCountInMonth
    ),
    maxRating: parseMinimumFilterValue(filters.minimums.maxRating),
    rating: parseMinimumFilterValue(filters.minimums.rating),
  };

  return rows.filter((row) => {
    if (selectedGrades.size > 0 && !selectedGrades.has(row.grade ?? "")) {
      return false;
    }

    if (selectedMajors.size > 0 && !selectedMajors.has(row.major ?? "")) {
      return false;
    }

    return numberFilterConfigs.every(({ key }) =>
      hasMinimumValue(row.codeforces?.[key], minimumValues[key])
    );
  });
};

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

const formatRelativeTime = (value: null | string) => {
  if (!value) {
    return emptyText;
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );

  if (diffSeconds < minuteSeconds) {
    return "刚刚";
  }

  if (diffSeconds < hourSeconds) {
    return `${Math.floor(diffSeconds / minuteSeconds)} 分钟前`;
  }

  if (diffSeconds < daySeconds) {
    return `${Math.floor(diffSeconds / hourSeconds)} 小时前`;
  }

  if (diffSeconds < weekSeconds) {
    return `${Math.floor(diffSeconds / daySeconds)} 天前`;
  }

  if (diffSeconds < monthSeconds) {
    return `${Math.floor(diffSeconds / weekSeconds)} 周前`;
  }

  if (diffSeconds < yearSeconds) {
    return `${Math.floor(diffSeconds / monthSeconds)} 个月前`;
  }

  return `${Math.floor(diffSeconds / yearSeconds)} 年前`;
};

const isDormant = (value: null | string) =>
  value
    ? Date.now() - new Date(value).getTime() > dormantSeconds * 1000
    : false;

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

function RelativeTimeCell({ value }: { value: null | string }) {
  if (!value) {
    return <EmptyCell />;
  }

  return (
    <span
      className={isDormant(value) ? "font-medium text-danger" : undefined}
      title={formatDateTime(value)}
    >
      {formatRelativeTime(value)}
    </span>
  );
}

function FilterMenu({
  label,
  onChange,
  options,
  selectedValues,
}: FilterMenuProps) {
  const [query, setQuery] = useState("");
  const selectedCount = selectedValues.length;
  const buttonLabel = selectedCount > 0 ? `${label} ${selectedCount}` : label;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = normalizedQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(normalizedQuery)
      )
    : options;
  const shouldShowSearch = options.length >= filterSearchThreshold;

  return (
    <Popover>
      <Button size="sm" variant="outline">
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
            <>
              {shouldShowSearch ? (
                <TextField fullWidth onChange={setQuery} value={query}>
                  <Label className="sr-only">搜索{label}</Label>
                  <Input
                    autoComplete="off"
                    placeholder={`搜索${label}`}
                    variant="secondary"
                  />
                </TextField>
              ) : null}
              {visibleOptions.length > 0 ? (
                <CheckboxGroup
                  className="grid max-h-72 gap-2 overflow-y-auto pr-1"
                  onChange={onChange}
                  value={selectedValues}
                >
                  {visibleOptions.map((option) => (
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
                <p className="text-muted text-sm">没有匹配项</p>
              )}
            </>
          ) : (
            <p className="text-muted text-sm">暂无可选项</p>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function NumberFilterMenu({ minimums, onChange }: NumberFilterMenuProps) {
  const activeCount = getActiveNumberFilterCount(minimums);
  const buttonLabel =
    activeCount > 0 ? `Rating 与 AC 数 ${activeCount}` : "Rating 与 AC 数";

  return (
    <Popover>
      <Button size="sm" variant="outline">
        <SlidersHorizontal className="size-4" />
        {buttonLabel}
        <ChevronDown className="size-4" />
      </Button>
      <Popover.Content className="w-72">
        <Popover.Dialog className="grid gap-3">
          <Popover.Heading className="font-semibold text-sm">
            最低数值
          </Popover.Heading>
          <div className="grid gap-3">
            {numberFilterConfigs.map((filter) => (
              <TextField
                fullWidth
                key={filter.key}
                onChange={(value) => onChange(filter.key, value)}
                value={minimums[filter.key]}
              >
                <Label>{filter.label}</Label>
                <Input
                  inputMode="numeric"
                  placeholder={filter.placeholder}
                  type="number"
                  variant="secondary"
                />
              </TextField>
            ))}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function RankToolbar({
  filters,
  gradeOptions,
  hasActiveFilters,
  majorOptions,
  onClearFilters,
  onFilterChange,
  onMinimumFilterChange,
  onResetColumns,
  onVisibleColumnChange,
  visibleColumnIds,
}: RankToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu
        label="年级"
        onChange={(values) => onFilterChange("grades", values)}
        options={gradeOptions}
        selectedValues={filters.grades}
      />
      <FilterMenu
        label="专业"
        onChange={(values) => onFilterChange("majors", values)}
        options={majorOptions}
        selectedValues={filters.majors}
      />
      <NumberFilterMenu
        minimums={filters.minimums}
        onChange={onMinimumFilterChange}
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
        columns={rankColumns}
        onReset={onResetColumns}
        onVisibleChange={onVisibleColumnChange}
        visibleColumnIds={visibleColumnIds}
      />
    </div>
  );
}

const renderNameCell = (row: RankRow) => {
  const displayName = getDisplayName(row);
  const profileUrl = getProfileUrl(row);

  if (profileUrl) {
    return (
      <LinkedText href={profileUrl} tone="text-foreground">
        {displayName}
      </LinkedText>
    );
  }

  return <span className="truncate">{displayName}</span>;
};

const renderMajorCell = (row: RankRow) =>
  row.major ? <span className="truncate">{row.major}</span> : <EmptyCell />;

const renderHandleCell = (row: RankRow) => {
  const codeforces = row.codeforces;

  if (!codeforces) {
    return <EmptyCell />;
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
  grade: (row) => row.grade ?? <EmptyCell />,
  handle: renderHandleCell,
  index: (_row, index) => index + 1,
  lastOnlineAt: (row) => (
    <RelativeTimeCell value={row.codeforces?.lastOnlineAt ?? null} />
  ),
  major: renderMajorCell,
  maxRating: (row) => <RatingText value={row.codeforces?.maxRating ?? null} />,
  name: renderNameCell,
  rating: (row) => <RatingText value={row.codeforces?.rating ?? null} />,
  status: (row) => (
    <StatusChip
      lastError={row.codeforces?.lastError}
      status={row.codeforces?.status ?? "missing-account"}
    />
  ),
} as const satisfies Record<
  RankColumnId,
  (row: RankRow, index: number) => ReactNode
>;

function renderRankCell(columnId: RankColumnId, row: RankRow, index: number) {
  return rankCellRenderers[columnId](row, index);
}

function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: ReactNode;
  sortDirection?: SortDirection;
}) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span>{children}</span>
      <ArrowUpDown
        className={`size-3 transition-transform ${
          sortDirection === "descending" ? "rotate-180" : ""
        } ${sortDirection ? "text-accent" : "text-muted"}`}
      />
    </span>
  );
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

function RankTable({
  onSortChange,
  rows,
  sort,
  visibleColumns,
}: RankTableProps) {
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
              const displayName = getDisplayName(row);

              return (
                <Table.Row
                  className="h-14"
                  id={row.userId}
                  key={row.userId}
                  textValue={displayName}
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

export default function CodeforcesRankPage() {
  const [sort, setSort] = useState<SortState>({
    column: "rating",
    direction: "descending",
  });
  const [filters, setFilters] = useState<RankFilters>(emptyRankFilters);
  const visibleColumnControls = useColumnVisibility({
    columns: rankColumns,
    storageKey: rankColumnVisibilityStorageKey,
  });
  const rankQuery = useQuery(trpc.rank.codeforces.list.queryOptions());
  const rankRows = rankQuery.data ?? [];
  const gradeOptions = useMemo(
    () => getRankFilterOptions(rankRows, "grade"),
    [rankRows]
  );
  const majorOptions = useMemo(
    () => getRankFilterOptions(rankRows, "major"),
    [rankRows]
  );
  const filteredRows = useMemo(
    () => filterRankRows(rankRows, filters),
    [filters, rankRows]
  );
  const rows = useMemo(
    () => sortRankRows(filteredRows, sort),
    [filteredRows, sort]
  );
  const total = rankRows.length;
  const hasActiveFilters = hasActiveRankFilters(filters);

  const handleFilterChange = (key: "grades" | "majors", values: string[]) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: values,
    }));
  };

  const handleMinimumFilterChange = (key: NumberFilterKey, value: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      minimums: {
        ...currentFilters.minimums,
        [key]: value,
      },
    }));
  };

  const handleClearFilters = () => {
    setFilters(emptyRankFilters);
  };

  return (
    <AppShell
      description="队内成员 Codeforces 数据"
      icon={<Trophy className="size-4" />}
      title="Codeforces 排行榜"
    >
      <Card>
        <Card.Header>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Card.Description>公开榜单</Card.Description>
              <Card.Title className="mt-1">
                {rankQuery.isSuccess && hasActiveFilters
                  ? `${rows.length} / ${total} 位成员`
                  : null}
                {rankQuery.isSuccess && !hasActiveFilters
                  ? `${total} 位成员`
                  : null}
                {rankQuery.isSuccess ? null : "成员数据"}
              </Card.Title>
            </div>
            <div className="flex items-center gap-3 text-muted text-sm">
              {rankQuery.isFetching ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner color="current" size="sm" />
                  读取中
                </span>
              ) : null}
            </div>
          </div>
        </Card.Header>
        <Card.Content className="grid gap-4">
          {rankQuery.isPending ? (
            <Alert>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>正在读取排行榜。</Alert.Description>
              </Alert.Content>
            </Alert>
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

          {rankQuery.isSuccess && total === 0 ? (
            <Alert>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>暂无用户。</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {rankQuery.isSuccess && total > 0 ? (
            <>
              <RankToolbar
                filters={filters}
                gradeOptions={gradeOptions}
                hasActiveFilters={hasActiveFilters}
                majorOptions={majorOptions}
                onClearFilters={handleClearFilters}
                onFilterChange={handleFilterChange}
                onMinimumFilterChange={handleMinimumFilterChange}
                onResetColumns={visibleColumnControls.resetColumns}
                onVisibleColumnChange={visibleColumnControls.setColumnVisible}
                visibleColumnIds={visibleColumnControls.visibleColumnIds}
              />
              {rows.length > 0 ? (
                <RankTable
                  onSortChange={setSort}
                  rows={rows}
                  sort={sort}
                  visibleColumns={visibleColumnControls.visibleColumns}
                />
              ) : (
                <Alert>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      没有匹配筛选条件的成员。
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </>
          ) : null}
        </Card.Content>
      </Card>
    </AppShell>
  );
}
