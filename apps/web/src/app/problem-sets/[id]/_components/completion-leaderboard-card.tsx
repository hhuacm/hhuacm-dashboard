"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Label,
  NumberField,
  Popover,
  Spinner,
  Table,
} from "@heroui/react";
import {
  type CurrentMemberStatus,
  currentMemberStatuses,
  getUserNameLabel,
  memberStatusLabels,
} from "@hhuacm-dashboard/domain";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";
import {
  filterCompletionRows,
  getCompletionGradeOptions,
  getProfileUrl,
  type ProblemSetCompletion,
  sortCompletionRows,
} from "../_model/problem-set-detail-view";

const emptyText = "-";
const memberStatusOptions = currentMemberStatuses.map((status) => ({
  label: memberStatusLabels[status],
  value: status,
}));

function CurrentUserSuffix({ isCurrentUser }: { isCurrentUser: boolean }) {
  if (!isCurrentUser) {
    return null;
  }

  return <span className="shrink-0 text-accent">（我）</span>;
}

function LinkedProfileName({
  isCurrentUser,
  row,
}: {
  isCurrentUser: boolean;
  row: ProblemSetCompletion;
}) {
  const nameLabel = getUserNameLabel(row);

  return (
    <a
      className="flex min-w-0 max-w-full items-center justify-center font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
      href={getProfileUrl(row.username)}
    >
      <span className="truncate">{nameLabel}</span>
      <CurrentUserSuffix isCurrentUser={isCurrentUser} />
    </a>
  );
}

function CompletionCountFilter({
  value,
  onChange,
}: {
  onChange: (value: number | undefined) => void;
  value: number | undefined;
}) {
  const buttonLabel = value === undefined ? "完成数" : `完成数 ≥ ${value}`;

  return (
    <Popover>
      <Button size="sm" variant="outline">
        <SlidersHorizontal className="size-4" />
        {buttonLabel}
        <ChevronDown className="size-4" />
      </Button>
      <Popover.Content className="w-44">
        <Popover.Dialog className="grid gap-3">
          <Popover.Heading className="font-semibold text-sm">
            完成数筛选
          </Popover.Heading>
          <NumberField
            className="w-full min-w-0 gap-2"
            fullWidth
            key={value === undefined ? "empty" : "valued"}
            minValue={0}
            name="minCompletedCount"
            onChange={onChange}
            step={1}
            value={value}
            variant="secondary"
          >
            <Label>最低完成数</Label>
            <NumberField.Group className="flex w-full min-w-0 max-w-full overflow-hidden">
              <NumberField.Input className="w-0 min-w-0 flex-1" />
              <div className="flex h-full w-6 shrink-0 flex-col border-field-placeholder/15 border-l">
                <NumberField.IncrementButton className="flex h-1/2 w-6 items-center justify-center rounded-none border-0 pt-0.5 text-muted">
                  <ChevronUp aria-hidden="true" className="size-3" />
                </NumberField.IncrementButton>
                <NumberField.DecrementButton className="flex h-1/2 w-6 items-center justify-center rounded-none border-0 pb-0.5 text-muted">
                  <ChevronDown aria-hidden="true" className="size-3" />
                </NumberField.DecrementButton>
              </div>
            </NumberField.Group>
          </NumberField>
          <p className="text-muted text-xs leading-5">
            显示不少于该数值的成员。
          </p>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function GradeFilterMenu({
  onChange,
  options,
  selectedValues,
}: {
  onChange: (values: string[]) => void;
  options: { label: string; value: string }[];
  selectedValues: string[];
}) {
  const selectedCount = selectedValues.length;
  const buttonLabel = selectedCount > 0 ? `年级 ${selectedCount}` : "年级";

  return (
    <Popover>
      <Button isDisabled={options.length === 0} size="sm" variant="outline">
        <SlidersHorizontal className="size-4" />
        {buttonLabel}
        <ChevronDown className="size-4" />
      </Button>
      <Popover.Content className="w-48">
        <Popover.Dialog className="grid gap-3">
          <Popover.Heading className="font-semibold text-sm">
            年级筛选
          </Popover.Heading>
          {options.length > 0 ? (
            <CheckboxGroup
              className="grid max-h-64 gap-2 overflow-y-auto pr-1"
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

function MemberStatusFilterMenu({
  onChange,
  selectedValues,
}: {
  onChange: (values: CurrentMemberStatus[]) => void;
  selectedValues: CurrentMemberStatus[];
}) {
  const selectedCount = selectedValues.length;
  const buttonLabel = selectedCount > 0 ? `状态 ${selectedCount}` : "状态";

  return (
    <Popover>
      <Button size="sm" variant="outline">
        <SlidersHorizontal className="size-4" />
        {buttonLabel}
        <ChevronDown className="size-4" />
      </Button>
      <Popover.Content className="w-48">
        <Popover.Dialog className="grid gap-3">
          <Popover.Heading className="font-semibold text-sm">
            状态筛选
          </Popover.Heading>
          <CheckboxGroup
            className="grid gap-2"
            onChange={(values) => onChange(values as CurrentMemberStatus[])}
            value={selectedValues}
          >
            {memberStatusOptions.map((option) => (
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
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export function CompletionLeaderboardCard({
  problemSetId,
}: {
  problemSetId: string;
}) {
  const session = authClient.useSession();
  const currentUserId = session.data?.user.id ?? null;
  const [minCompletedCount, setMinCompletedCount] = useState<
    number | undefined
  >(undefined);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedMemberStatuses, setSelectedMemberStatuses] = useState<
    CurrentMemberStatus[]
  >([]);
  const completionsQuery = useQuery(
    trpc.problemSet.completions.queryOptions({ id: problemSetId })
  );
  const rows = useMemo(
    () => sortCompletionRows(completionsQuery.data ?? []),
    [completionsQuery.data]
  );
  const gradeOptions = useMemo(() => getCompletionGradeOptions(rows), [rows]);
  const filteredRows = useMemo(
    () =>
      filterCompletionRows(rows, {
        minCompletedCount,
        selectedGrades,
        selectedMemberStatuses,
      }),
    [minCompletedCount, rows, selectedGrades, selectedMemberStatuses]
  );
  const hasActiveFilters =
    minCompletedCount !== undefined ||
    selectedGrades.length > 0 ||
    selectedMemberStatuses.length > 0;

  const clearFilters = () => {
    setMinCompletedCount(undefined);
    setSelectedGrades([]);
    setSelectedMemberStatuses([]);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>题单完成榜</Card.Title>
      </Card.Header>
      <Card.Content className="grid gap-4">
        {completionsQuery.isPending ? (
          <div className="flex items-center gap-3 text-sm">
            <Spinner color="current" size="sm" />
            <p className="font-medium">正在加载完成榜。</p>
          </div>
        ) : null}

        {completionsQuery.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>完成榜加载失败</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}

        {!(completionsQuery.isPending || completionsQuery.isError) &&
        rows.length === 0 ? (
          <p className="text-muted text-sm">暂无完成记录</p>
        ) : null}

        {rows.length > 0 ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CompletionCountFilter
                onChange={setMinCompletedCount}
                value={minCompletedCount}
              />
              <GradeFilterMenu
                onChange={setSelectedGrades}
                options={gradeOptions}
                selectedValues={selectedGrades}
              />
              <MemberStatusFilterMenu
                onChange={setSelectedMemberStatuses}
                selectedValues={selectedMemberStatuses}
              />
              <Button
                isDisabled={!hasActiveFilters}
                onPress={clearFilters}
                size="sm"
                variant="ghost"
              >
                <X className="size-4" />
                清除筛选
              </Button>
            </div>
            {hasActiveFilters ? (
              <p className="text-muted text-sm">
                显示 {filteredRows.length} / {rows.length} 条
              </p>
            ) : null}
          </div>
        ) : null}

        {rows.length > 0 && filteredRows.length === 0 ? (
          <p className="text-muted text-sm">没有符合筛选条件的记录</p>
        ) : null}

        {filteredRows.length > 0 ? (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="题单完成榜" className="min-w-60">
                <Table.Header>
                  <Table.Column className="w-12 text-center">#</Table.Column>
                  <Table.Column className="text-center" isRowHeader>
                    姓名
                  </Table.Column>
                  <Table.Column className="w-20 text-center">年级</Table.Column>
                  <Table.Column className="w-20 text-center">
                    过题数
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {filteredRows.map((row, index) => {
                    const isCurrentUser = row.userId === currentUserId;
                    const currentUserLabel = isCurrentUser ? " 我" : "";
                    const nameLabel = getUserNameLabel(row);
                    const gradeLabel = row.grade ?? emptyText;

                    return (
                      <Table.Row
                        className={clsx(isCurrentUser && "bg-accent-soft/60")}
                        id={row.userId}
                        key={row.userId}
                        textValue={`${nameLabel}${currentUserLabel} ${gradeLabel} ${row.completedProblemCount}`}
                      >
                        <Table.Cell className="text-center text-muted">
                          {index + 1}
                        </Table.Cell>
                        <Table.Cell className="min-w-0 text-center">
                          <LinkedProfileName
                            isCurrentUser={isCurrentUser}
                            row={row}
                          />
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {gradeLabel}
                        </Table.Cell>
                        <Table.Cell className="text-center font-semibold">
                          {row.completedProblemCount}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        ) : null}
      </Card.Content>
    </Card>
  );
}
