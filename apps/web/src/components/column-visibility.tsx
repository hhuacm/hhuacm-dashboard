"use client";

import { Button, Checkbox, CheckboxGroup, Label, Popover } from "@heroui/react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

export interface TableColumnVisibilityConfig<ColumnId extends string> {
  defaultVisible: boolean;
  id: ColumnId;
  label: string;
  required?: boolean;
}

interface ColumnVisibilityMenuProps<ColumnId extends string> {
  columns: readonly TableColumnVisibilityConfig<ColumnId>[];
  onReset: () => void;
  onVisibleChange: (columnId: ColumnId, isVisible: boolean) => void;
  visibleColumnIds: readonly ColumnId[];
}

interface UseColumnVisibilityOptions<
  ColumnConfig extends TableColumnVisibilityConfig<string>,
> {
  columns: readonly ColumnConfig[];
  storageKey?: string;
}

type ColumnIdOf<ColumnConfig extends TableColumnVisibilityConfig<string>> =
  ColumnConfig["id"] & string;

const getDefaultVisibleColumnIds = <
  ColumnConfig extends TableColumnVisibilityConfig<string>,
>(
  columns: readonly ColumnConfig[]
) =>
  columns
    .filter((column) => column.defaultVisible || column.required)
    .map((column) => column.id as ColumnIdOf<ColumnConfig>);

const sanitizeVisibleColumnIds = <
  ColumnConfig extends TableColumnVisibilityConfig<string>,
>(
  columnIds: readonly string[],
  columns: readonly ColumnConfig[]
) => {
  const selectedColumnIds = new Set(columnIds);
  const nextColumnIds = columns
    .filter((column) => selectedColumnIds.has(column.id) || column.required)
    .map((column) => column.id as ColumnIdOf<ColumnConfig>);

  if (nextColumnIds.length > 0) {
    return nextColumnIds;
  }

  return getDefaultVisibleColumnIds(columns);
};

export function useColumnVisibility<
  ColumnConfig extends TableColumnVisibilityConfig<string>,
>({ columns, storageKey }: UseColumnVisibilityOptions<ColumnConfig>) {
  const defaultVisibleColumnIds = getDefaultVisibleColumnIds(columns);
  const [storedColumnIds, setStoredColumnIds] = useState<
    ColumnIdOf<ColumnConfig>[] | null
  >(() => (storageKey ? null : defaultVisibleColumnIds));
  const visibleColumnIds = sanitizeVisibleColumnIds(
    storedColumnIds ?? defaultVisibleColumnIds,
    columns
  );

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      setStoredColumnIds(getDefaultVisibleColumnIds(columns));
      return;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);

      if (Array.isArray(parsedValue)) {
        setStoredColumnIds(sanitizeVisibleColumnIds(parsedValue, columns));
      } else {
        setStoredColumnIds(getDefaultVisibleColumnIds(columns));
      }
    } catch {
      setStoredColumnIds(getDefaultVisibleColumnIds(columns));
    }
  }, [columns, storageKey]);

  const visibleColumnIdSet = new Set(visibleColumnIds);
  const visibleColumns = columns.filter((column) =>
    visibleColumnIdSet.has(column.id)
  );
  const saveVisibleColumnIds = (nextColumnIds: ColumnIdOf<ColumnConfig>[]) => {
    setStoredColumnIds(nextColumnIds);

    if (storageKey) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextColumnIds));
    }
  };
  const setColumnVisible = (
    columnId: ColumnIdOf<ColumnConfig>,
    isVisible: boolean
  ) => {
    const nextColumnIdSet = new Set(visibleColumnIds);
    const column = columns.find((item) => item.id === columnId);

    if (column?.required || (column && isVisible)) {
      nextColumnIdSet.add(columnId);
    } else {
      nextColumnIdSet.delete(columnId);
    }

    saveVisibleColumnIds(
      sanitizeVisibleColumnIds([...nextColumnIdSet], columns)
    );
  };
  const resetColumns = () => {
    saveVisibleColumnIds(defaultVisibleColumnIds);
  };

  return {
    resetColumns,
    setColumnVisible,
    visibleColumnIds,
    visibleColumns,
  };
}

export function ColumnVisibilityMenu<ColumnId extends string>({
  columns,
  onReset,
  onVisibleChange,
  visibleColumnIds,
}: ColumnVisibilityMenuProps<ColumnId>) {
  const visibleColumnIdSet = new Set(visibleColumnIds);
  const hasDefaultVisibility = columns.every((column) => {
    const shouldBeVisible = column.defaultVisible || column.required;
    return visibleColumnIdSet.has(column.id) === shouldBeVisible;
  });

  const handleChange = (values: string[]) => {
    const selectedColumnIds = new Set(values);

    for (const column of columns) {
      onVisibleChange(column.id, selectedColumnIds.has(column.id));
    }
  };

  return (
    <Popover>
      <Button size="sm" variant="outline">
        <SlidersHorizontal className="size-4" />
        列设置
        <ChevronDown className="size-4" />
      </Button>
      <Popover.Content className="w-56">
        <Popover.Dialog className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <Popover.Heading className="font-semibold text-sm">
              列设置
            </Popover.Heading>
            <Button
              className="h-7 px-2 text-xs"
              isDisabled={hasDefaultVisibility}
              onPress={onReset}
              size="sm"
              variant="ghost"
            >
              恢复默认
            </Button>
          </div>
          <CheckboxGroup
            aria-label="可见列"
            className="grid max-h-72 gap-2 overflow-y-auto pr-1 pb-4"
            onChange={handleChange}
            value={[...visibleColumnIds]}
          >
            {columns.map((column) => (
              <Checkbox
                isDisabled={column.required}
                key={column.id}
                value={column.id}
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                  <Label>{column.label}</Label>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
