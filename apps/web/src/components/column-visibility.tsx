"use client";

import { Button, Checkbox, CheckboxGroup, Label, Popover } from "@heroui/react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const defaultVisibleColumnIds = useMemo(
    () => getDefaultVisibleColumnIds(columns),
    [columns]
  );
  const [visibleColumnIds, setVisibleColumnIds] = useState<
    ColumnIdOf<ColumnConfig>[]
  >(defaultVisibleColumnIds);
  const [isStorageLoaded, setIsStorageLoaded] = useState(!storageKey);

  useEffect(() => {
    setVisibleColumnIds((currentColumnIds) =>
      sanitizeVisibleColumnIds(currentColumnIds, columns)
    );
  }, [columns]);

  useEffect(() => {
    if (!storageKey) {
      setIsStorageLoaded(true);
      return;
    }

    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      setVisibleColumnIds(defaultVisibleColumnIds);
      setIsStorageLoaded(true);
      return;
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue);

      if (Array.isArray(parsedValue)) {
        setVisibleColumnIds(sanitizeVisibleColumnIds(parsedValue, columns));
      } else {
        setVisibleColumnIds(defaultVisibleColumnIds);
      }
    } catch {
      setVisibleColumnIds(defaultVisibleColumnIds);
    }

    setIsStorageLoaded(true);
  }, [columns, defaultVisibleColumnIds, storageKey]);

  useEffect(() => {
    if (!(storageKey && isStorageLoaded)) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumnIds));
  }, [isStorageLoaded, storageKey, visibleColumnIds]);

  const visibleColumnIdSet = useMemo(
    () => new Set(visibleColumnIds),
    [visibleColumnIds]
  );
  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnIdSet.has(column.id)),
    [columns, visibleColumnIdSet]
  );
  const isColumnVisible = useCallback(
    (columnId: ColumnIdOf<ColumnConfig>) => visibleColumnIdSet.has(columnId),
    [visibleColumnIdSet]
  );
  const setColumnVisible = useCallback(
    (columnId: ColumnIdOf<ColumnConfig>, isVisible: boolean) => {
      setVisibleColumnIds((currentColumnIds) => {
        const currentColumnIdSet = new Set(currentColumnIds);
        const column = columns.find((item) => item.id === columnId);

        if (column?.required) {
          currentColumnIdSet.add(columnId);
          return sanitizeVisibleColumnIds([...currentColumnIdSet], columns);
        }

        if (column && isVisible) {
          currentColumnIdSet.add(columnId);
        } else {
          currentColumnIdSet.delete(columnId);
        }

        return sanitizeVisibleColumnIds([...currentColumnIdSet], columns);
      });
    },
    [columns]
  );
  const resetColumns = useCallback(() => {
    setVisibleColumnIds(defaultVisibleColumnIds);
  }, [defaultVisibleColumnIds]);

  return {
    isColumnVisible,
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
  const visibleColumnIdSet = useMemo(
    () => new Set(visibleColumnIds),
    [visibleColumnIds]
  );
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
            className="grid gap-2"
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
