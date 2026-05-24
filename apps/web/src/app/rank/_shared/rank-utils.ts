export const emptyText = "—";

const minuteSeconds = 60;
const hourSeconds = 60 * minuteSeconds;
const daySeconds = 24 * hourSeconds;
const weekSeconds = 7 * daySeconds;
const monthSeconds = 30 * daySeconds;
const yearSeconds = 365 * daySeconds;
const dormantSeconds = 30 * daySeconds;
const rankTableMinWidth = 720;

export const rankTableColumnClassName =
  "whitespace-nowrap text-center font-bold";
export const rankTableCellClassName = "text-center";

export const statusConfig = {
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
} as const;

export type SortDirection = "ascending" | "descending";

export interface FilterOption {
  label: string;
  value: string;
}

export const getVisibleTableMinWidth = (
  columns: readonly { minWidth: number }[]
) => {
  let minWidth = 0;

  for (const column of columns) {
    minWidth += column.minWidth;
  }

  return Math.max(rankTableMinWidth, minWidth);
};

export const getRankFilterOptions = <Row extends Record<string, unknown>>(
  rows: readonly Row[],
  key: keyof Row & string
): FilterOption[] => {
  const values = new Set<string>();

  for (const row of rows) {
    const value = (row[key] as null | string | undefined)?.trim();

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

export const parseMinimumFilterValue = (value: string) => {
  const input = value.trim();

  if (!input) {
    return null;
  }

  const parsedValue = Number(input);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const hasMinimumValue = (
  value: null | number | undefined,
  minimum: null | number
) =>
  minimum === null ||
  (value !== null && value !== undefined && value >= minimum);

export const compareNullableNumbers = (
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

export const formatNumber = (value: null | number) =>
  value === null ? emptyText : value.toLocaleString("zh-CN");

export const formatDecimal = (value: null | number) =>
  value === null ? emptyText : value.toFixed(2);

export const formatDateTime = (value: null | string) => {
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

export const formatRelativeTime = (value: null | string) => {
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

export const isDormant = (value: null | string) =>
  value
    ? Date.now() - new Date(value).getTime() > dormantSeconds * 1000
    : false;
