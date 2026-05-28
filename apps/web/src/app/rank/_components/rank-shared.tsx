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
import clsx from "clsx";
import {
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  type Key,
  type ReactNode,
  useMemo,
  useState,
} from "react";

import {
  ColumnVisibilityMenu,
  type TableColumnVisibilityConfig,
  useColumnVisibility,
} from "@/components/column-visibility";
import type {
  RankBoardBaseConfig,
  RankColumnConfig,
  RankFilterState,
  RankNumberFilterConfig,
  RankSortState,
} from "../_shared/rank-config";
import {
  getRankFilterOptions,
  getVisibleTableMinWidth,
  rankTableCellClassName,
  rankTableColumnClassName,
  type SortDirection,
} from "../_shared/rank-utils";

export interface RankFilterOption {
  label: string;
  value: string;
}

interface RankQueryResult<Row> {
  data?: Row[];
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  isSuccess: boolean;
}

export interface RankBoardTableProps<
  Row,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<string>,
> {
  onSortChange: (sort: RankSortState<SortColumn>) => void;
  rows: Row[];
  sort: RankSortState<SortColumn>;
  visibleColumns: readonly ColumnConfig[];
}

export interface RankBoardConfig<
  Row extends Record<string, unknown>,
  ColumnId extends string,
  FilterKey extends string,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<ColumnId>,
> extends RankBoardBaseConfig<
    Row,
    ColumnId,
    FilterKey,
    SortColumn,
    ColumnConfig
  > {
  renderTable: (
    props: RankBoardTableProps<Row, SortColumn, ColumnConfig>
  ) => ReactNode;
}

interface RankBoardProps<
  Row extends Record<string, unknown>,
  ColumnId extends string,
  FilterKey extends string,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<ColumnId>,
> {
  config: RankBoardConfig<Row, ColumnId, FilterKey, SortColumn, ColumnConfig>;
  query: RankQueryResult<Row>;
}

interface RankDataTableProps<
  Row,
  ColumnId extends string,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<ColumnId>,
> {
  ariaLabel: string;
  getRowId: (row: Row) => string;
  getRowTextValue: (row: Row) => string;
  isRankSortColumn: (columnId: ColumnId) => columnId is ColumnId & SortColumn;
  isSortColumn: (key: Key) => key is SortColumn;
  onSortChange: (sort: {
    column: SortColumn;
    direction: SortDirection;
  }) => void;
  renderCell: (columnId: ColumnId, row: Row, index: number) => ReactNode;
  rows: Row[];
  sort: {
    column: SortColumn;
    direction: SortDirection;
  };
  visibleColumns: readonly ColumnConfig[];
}

interface EmptyCellProps {
  emptyText: string;
}

interface LinkedTextProps {
  children: ReactNode;
  href: string;
  tone?: string;
}

interface RelativeTimeCellProps {
  emptyText: string;
  formatDateTime: (value: null | string) => string;
  formatRelativeTime: (value: null | string) => string;
  isDormant: (value: null | string) => boolean;
  value: null | string;
}

interface StatusChipProps<Status extends string> {
  status: Status;
  statusConfig: Record<Status, { className: string; label: string }>;
}

interface FilterMenuProps {
  label: string;
  onChange: (values: string[]) => void;
  options: RankFilterOption[];
  searchThreshold: number;
  selectedValues: string[];
}

interface NumberFilterMenuProps<FilterKey extends string> {
  activeCount: number;
  buttonText: string;
  filters: readonly RankNumberFilterConfig<FilterKey>[];
  inputMode: "decimal" | "numeric";
  minimums: Record<FilterKey, string>;
  onChange: (key: FilterKey, value: string) => void;
}

interface RankToolbarProps<
  ColumnId extends string,
  FilterKey extends string,
  ColumnConfig extends TableColumnVisibilityConfig<ColumnId>,
> {
  columns: readonly ColumnConfig[];
  filters: {
    grades: string[];
    majors: string[];
    minimums: Record<FilterKey, string>;
  };
  gradeOptions: RankFilterOption[];
  hasActiveFilters: boolean;
  majorOptions: RankFilterOption[];
  numberFilterActiveCount: number;
  numberFilterButtonText: string;
  numberFilterConfigs: readonly RankNumberFilterConfig<FilterKey>[];
  numberFilterInputMode: "decimal" | "numeric";
  onClearFilters: () => void;
  onFilterChange: (key: "grades" | "majors", values: string[]) => void;
  onMinimumFilterChange: (key: FilterKey, value: string) => void;
  onResetColumns: () => void;
  onVisibleColumnChange: (columnId: ColumnId, isVisible: boolean) => void;
  searchThreshold: number;
  visibleColumnIds: readonly ColumnId[];
}

export function EmptyCell({ emptyText }: EmptyCellProps) {
  return <span className="text-muted">{emptyText}</span>;
}

export function LinkedText({
  children,
  href,
  tone = "text-accent",
}: LinkedTextProps) {
  const isExternal = href.startsWith("http");

  return (
    <a
      className={clsx(
        "inline-flex min-w-0 items-center gap-1 font-medium underline-offset-4 hover:underline focus-visible:underline",
        tone
      )}
      href={href}
      rel={isExternal ? "noopener noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      <span className="truncate">{children}</span>
      {isExternal ? <ExternalLink className="size-3.5" /> : null}
    </a>
  );
}

export function RelativeTimeCell({
  emptyText,
  formatDateTime,
  formatRelativeTime,
  isDormant,
  value,
}: RelativeTimeCellProps) {
  if (!value) {
    return <EmptyCell emptyText={emptyText} />;
  }

  return (
    <span
      className={clsx(isDormant(value) && "font-medium text-danger")}
      title={formatDateTime(value)}
    >
      {formatRelativeTime(value)}
    </span>
  );
}

export function StatusChip<Status extends string>({
  status,
  statusConfig,
}: StatusChipProps<Status>) {
  const config = statusConfig[status];

  return (
    <Chip className={config.className} size="sm" variant="soft">
      {config.label}
    </Chip>
  );
}

const hasActiveRankFilters = <FilterKey extends string>(
  filters: RankFilterState<FilterKey>,
  numberFilterConfigs: readonly RankNumberFilterConfig<FilterKey>[]
) =>
  filters.grades.length > 0 ||
  filters.majors.length > 0 ||
  numberFilterConfigs.some(({ key }) => filters.minimums[key].trim());

const getActiveNumberFilterCount = <FilterKey extends string>(
  minimums: Record<FilterKey, string>,
  numberFilterConfigs: readonly RankNumberFilterConfig<FilterKey>[]
) =>
  numberFilterConfigs.filter(({ key }) => minimums[key].trim().length > 0)
    .length;

export function RankDataTable<
  Row,
  ColumnId extends string,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<ColumnId>,
>({
  ariaLabel,
  getRowId,
  getRowTextValue,
  isRankSortColumn,
  isSortColumn,
  onSortChange,
  renderCell,
  rows,
  sort,
  visibleColumns,
}: RankDataTableProps<Row, ColumnId, SortColumn, ColumnConfig>) {
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
          aria-label={ariaLabel}
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
                  isRankSortColumn(column.id) ? (
                    <SortableColumnHeader sortDirection={sortDirection}>
                      {column.label}
                    </SortableColumnHeader>
                  ) : (
                    column.label
                  )
                }
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body>
            {rows.map((row, index) => {
              const rowId = getRowId(row);

              return (
                <Table.Row
                  className="h-14"
                  id={rowId}
                  key={rowId}
                  textValue={getRowTextValue(row)}
                >
                  {visibleColumns.map((column) => (
                    <Table.Cell
                      className={clsx(
                        rankTableCellClassName,
                        column.cellClassName
                      )}
                      key={column.id}
                    >
                      {renderCell(column.id, row, index)}
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

export function RankBoard<
  Row extends Record<string, unknown>,
  ColumnId extends string,
  FilterKey extends string,
  SortColumn extends string,
  ColumnConfig extends RankColumnConfig<ColumnId>,
>({
  config,
  query,
}: RankBoardProps<Row, ColumnId, FilterKey, SortColumn, ColumnConfig>) {
  const {
    columns,
    defaultSort,
    emptyFilters,
    filterRows,
    filterSearchThreshold,
    numberFilterButtonText,
    numberFilterConfigs,
    numberFilterInputMode,
    renderTable,
    sortRows,
    storageKey,
  } = config;
  const [sort, setSort] = useState(defaultSort);
  const [filters, setFilters] = useState(emptyFilters);
  const visibleColumnControls = useColumnVisibility({
    columns,
    storageKey,
  });
  const rankRows = query.data ?? [];
  const gradeOptions = useMemo(
    () => getRankFilterOptions(rankRows, "grade"),
    [rankRows]
  );
  const majorOptions = useMemo(
    () => getRankFilterOptions(rankRows, "major"),
    [rankRows]
  );
  const filteredRows = useMemo(
    () => filterRows(rankRows, filters),
    [filterRows, filters, rankRows]
  );
  const rows = useMemo(
    () => sortRows(filteredRows, sort),
    [filteredRows, sort, sortRows]
  );
  const total = rankRows.length;
  const filtersActive = hasActiveRankFilters(filters, numberFilterConfigs);
  const activeNumberFilterCount = getActiveNumberFilterCount(
    filters.minimums,
    numberFilterConfigs
  );

  const handleFilterChange = (key: "grades" | "majors", values: string[]) => {
    setFilters((currentFilters) =>
      key === "grades"
        ? {
            ...currentFilters,
            grades: values,
          }
        : {
            ...currentFilters,
            majors: values,
          }
    );
  };

  const handleMinimumFilterChange = (key: FilterKey, value: string) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      minimums: {
        ...currentFilters.minimums,
        [key]: value,
      },
    }));
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
  };

  return (
    <Card>
      <Card.Header>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Card.Title className="mt-1">
              {query.isSuccess && filtersActive
                ? `${rows.length} / ${total} 位成员`
                : null}
              {query.isSuccess && !filtersActive ? `${total} 位成员` : null}
              {query.isSuccess ? null : "成员数据"}
            </Card.Title>
          </div>
          <div className="flex items-center gap-3 text-muted text-sm">
            {query.isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Spinner color="current" size="sm" />
                读取中
              </span>
            ) : null}
          </div>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4">
        {query.isPending ? (
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>正在读取排行榜。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {query.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>排行榜加载失败</Alert.Title>
              <Alert.Description>请刷新页面后重试。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {query.isSuccess && total === 0 ? (
          <Alert>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>暂无用户。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {query.isSuccess && total > 0 ? (
          <>
            <RankToolbar
              columns={columns}
              filters={filters}
              gradeOptions={gradeOptions}
              hasActiveFilters={filtersActive}
              majorOptions={majorOptions}
              numberFilterActiveCount={activeNumberFilterCount}
              numberFilterButtonText={numberFilterButtonText}
              numberFilterConfigs={numberFilterConfigs}
              numberFilterInputMode={numberFilterInputMode}
              onClearFilters={handleClearFilters}
              onFilterChange={handleFilterChange}
              onMinimumFilterChange={handleMinimumFilterChange}
              onResetColumns={visibleColumnControls.resetColumns}
              onVisibleColumnChange={visibleColumnControls.setColumnVisible}
              searchThreshold={filterSearchThreshold}
              visibleColumnIds={visibleColumnControls.visibleColumnIds}
            />
            {rows.length > 0 ? (
              renderTable({
                onSortChange: setSort,
                rows,
                sort,
                visibleColumns: visibleColumnControls.visibleColumns,
              })
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
  );
}

function FilterMenu({
  label,
  onChange,
  options,
  searchThreshold,
  selectedValues,
}: FilterMenuProps) {
  const [query, setQuery] = useState("");
  const selectedCount = selectedValues.length;
  const buttonLabel = selectedCount > 0 ? `${label} ${selectedCount}` : label;
  const searchQuery = query.trim().toLowerCase();
  const visibleOptions = searchQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery)
      )
    : options;
  const shouldShowSearch = options.length >= searchThreshold;

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

function NumberFilterMenu<FilterKey extends string>({
  activeCount,
  buttonText,
  filters,
  inputMode,
  minimums,
  onChange,
}: NumberFilterMenuProps<FilterKey>) {
  const buttonLabel =
    activeCount > 0 ? `${buttonText} ${activeCount}` : buttonText;

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
            {filters.map((filter) => (
              <TextField
                fullWidth
                key={filter.key}
                onChange={(value) => onChange(filter.key, value)}
                value={minimums[filter.key]}
              >
                <Label>{filter.label}</Label>
                <Input
                  inputMode={inputMode}
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

export function RankToolbar<
  ColumnId extends string,
  FilterKey extends string,
  ColumnConfig extends TableColumnVisibilityConfig<ColumnId>,
>({
  columns,
  filters,
  gradeOptions,
  hasActiveFilters,
  majorOptions,
  numberFilterActiveCount,
  numberFilterButtonText,
  numberFilterConfigs,
  numberFilterInputMode,
  onClearFilters,
  onFilterChange,
  onMinimumFilterChange,
  onResetColumns,
  onVisibleColumnChange,
  searchThreshold,
  visibleColumnIds,
}: RankToolbarProps<ColumnId, FilterKey, ColumnConfig>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu
        label="年级"
        onChange={(values) => onFilterChange("grades", values)}
        options={gradeOptions}
        searchThreshold={searchThreshold}
        selectedValues={filters.grades}
      />
      <FilterMenu
        label="专业"
        onChange={(values) => onFilterChange("majors", values)}
        options={majorOptions}
        searchThreshold={searchThreshold}
        selectedValues={filters.majors}
      />
      <NumberFilterMenu
        activeCount={numberFilterActiveCount}
        buttonText={numberFilterButtonText}
        filters={numberFilterConfigs}
        inputMode={numberFilterInputMode}
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
        columns={columns}
        onReset={onResetColumns}
        onVisibleChange={onVisibleColumnChange}
        visibleColumnIds={visibleColumnIds}
      />
    </div>
  );
}

export function SortableColumnHeader({
  children,
  sortDirection,
}: {
  children: ReactNode;
  sortDirection?: "ascending" | "descending";
}) {
  return (
    <span className="flex items-center justify-center gap-2">
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
