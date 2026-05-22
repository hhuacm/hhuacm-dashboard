"use client";

import { Alert, Card, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useColumnVisibility } from "@/components/column-visibility";
import { trpc } from "@/utils/trpc";
import { RankToolbar } from "../../_components/rank-shared";
import { getRankFilterOptions } from "../../_shared/rank-utils";
import {
  emptyRankFilters,
  filterRankRows,
  filterSearchThreshold,
  getActiveNumberFilterCount,
  hasActiveRankFilters,
  type NumberFilterKey,
  numberFilterConfigs,
  type RankFilters,
  rankColumns,
  rankColumnVisibilityStorageKey,
  type SortState,
  sortRankRows,
} from "../helpers";
import { CodeforcesRankTable } from "./codeforces-rank-table";

export function CodeforcesRankContent() {
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
    <Card>
      <Card.Header>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
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
              columns={rankColumns}
              filters={filters}
              gradeOptions={gradeOptions}
              hasActiveFilters={hasActiveFilters}
              majorOptions={majorOptions}
              numberFilterActiveCount={getActiveNumberFilterCount(
                filters.minimums
              )}
              numberFilterButtonText="Rating 与 AC 数"
              numberFilterConfigs={numberFilterConfigs}
              numberFilterInputMode="numeric"
              onClearFilters={handleClearFilters}
              onFilterChange={handleFilterChange}
              onMinimumFilterChange={handleMinimumFilterChange}
              onResetColumns={visibleColumnControls.resetColumns}
              onVisibleColumnChange={visibleColumnControls.setColumnVisible}
              searchThreshold={filterSearchThreshold}
              visibleColumnIds={visibleColumnControls.visibleColumnIds}
            />
            {rows.length > 0 ? (
              <CodeforcesRankTable
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
  );
}
