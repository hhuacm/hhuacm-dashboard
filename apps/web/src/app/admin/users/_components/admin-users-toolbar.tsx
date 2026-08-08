"use client";

import { Button, Checkbox, CheckboxGroup, Label, Popover } from "@heroui/react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

import { ColumnVisibilityMenu } from "@/components/column-visibility";
import {
  type AdminUsersColumnId,
  type AdminUsersVisibleColumnControls,
  adminUsersColumns,
} from "../_model/admin-users-table-columns";
import type {
  AdminUsersFilterOptions,
  AdminUsersFilters,
  FilterOption,
} from "../helpers";

interface FilterMenuProps {
  label: string;
  onChange: (values: string[]) => void;
  options: FilterOption[];
  selectedValues: string[];
}

interface AdminUsersToolbarProps {
  filterOptions: AdminUsersFilterOptions;
  filters: AdminUsersFilters;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onFilterChange: (key: keyof AdminUsersFilters, values: string[]) => void;
  visibleColumnControls: AdminUsersVisibleColumnControls;
}

function FilterMenu({
  label,
  onChange,
  options,
  selectedValues,
}: FilterMenuProps) {
  const selectedCount = selectedValues.length;
  const buttonLabel = selectedCount > 0 ? `${label} ${selectedCount}` : label;

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

export function AdminUsersToolbar({
  filterOptions,
  filters,
  hasActiveFilters,
  onClearFilters,
  onFilterChange,
  visibleColumnControls,
}: AdminUsersToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu
        label="状态"
        onChange={(values) => onFilterChange("memberStatuses", values)}
        options={filterOptions.memberStatuses}
        selectedValues={filters.memberStatuses}
      />
      <FilterMenu
        label="年级"
        onChange={(values) => onFilterChange("grades", values)}
        options={filterOptions.grades}
        selectedValues={filters.grades}
      />
      <FilterMenu
        label="OJ"
        onChange={(values) => onFilterChange("ojPlatforms", values)}
        options={filterOptions.ojPlatforms}
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
      <ColumnVisibilityMenu<AdminUsersColumnId>
        columns={adminUsersColumns}
        onReset={visibleColumnControls.resetColumns}
        onVisibleChange={visibleColumnControls.setColumnVisible}
        visibleColumnIds={visibleColumnControls.visibleColumnIds}
      />
    </div>
  );
}
