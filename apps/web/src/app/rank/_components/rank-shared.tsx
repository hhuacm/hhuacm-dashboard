"use client";

import {
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Input,
  Label,
  Popover,
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
import { type ReactNode, useState } from "react";

import {
  ColumnVisibilityMenu,
  type TableColumnVisibilityConfig,
} from "@/components/column-visibility";

export interface RankFilterOption {
  label: string;
  value: string;
}

export interface RankNumberFilterConfig<FilterKey extends string> {
  key: FilterKey;
  label: string;
  placeholder: string;
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
