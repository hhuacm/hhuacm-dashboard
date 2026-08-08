"use client";

import { Button } from "@heroui/react";
import { X } from "lucide-react";

import { ColumnVisibilityMenu } from "@/components/column-visibility";
import { MultiSelectFilterMenu } from "@/components/multi-select-filter-menu";
import {
  type AdminUsersColumnId,
  type AdminUsersVisibleColumnControls,
  adminUsersColumns,
} from "../_model/admin-users-table-columns";
import type { AdminUsersFilterOptions, AdminUsersFilters } from "../helpers";

interface AdminUsersToolbarProps {
  filterOptions: AdminUsersFilterOptions;
  filters: AdminUsersFilters;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onFilterChange: (key: keyof AdminUsersFilters, values: string[]) => void;
  visibleColumnControls: AdminUsersVisibleColumnControls;
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
      <MultiSelectFilterMenu
        label="状态"
        onChange={(values) => onFilterChange("memberStatuses", values)}
        options={filterOptions.memberStatuses}
        selectedValues={filters.memberStatuses}
      />
      <MultiSelectFilterMenu
        label="年级"
        onChange={(values) => onFilterChange("grades", values)}
        options={filterOptions.grades}
        selectedValues={filters.grades}
      />
      <MultiSelectFilterMenu
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
        onVisibleChange={visibleColumnControls.setVisibleColumnIds}
        visibleColumnIds={visibleColumnControls.visibleColumnIds}
      />
    </div>
  );
}
