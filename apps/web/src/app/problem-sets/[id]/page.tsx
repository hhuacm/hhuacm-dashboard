"use client";

import { Alert, Button, Card, Chip, Spinner, Table } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CircleMinus,
  CircleX,
  ListChecks,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type ReactNode, use, useMemo } from "react";

import { AppShell } from "@/components/app-shell";
import { MarkdownContent } from "@/components/markdown-content";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

interface ProblemSetDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ProblemTableProps {
  problems: ProblemSetProblem[];
}

interface SummaryPanelProps {
  descriptionMarkdown: string;
  problemSetId: string;
}

interface ProblemStatusChipProps {
  accepted: ProblemSetProblem["accepted"];
}

interface DifficultyChipProps {
  difficulty: null | number;
}

interface ProblemSetProblem {
  accepted: boolean | null;
  difficulty: number | null;
  pid: string;
  title: string;
}

interface ProblemSetCompletion {
  completedProblemCount: number;
  displayName: string;
  userId: string;
  username: null | string;
}

const luoguDifficultyClassNames = [
  "bg-[rgb(191,191,191)] text-[#333333]",
  "bg-[rgb(254,76,97)] text-white",
  "bg-[rgb(243,156,17)] text-white",
  "bg-[rgb(255,193,22)] text-[#713f12]",
  "bg-[rgb(83,196,26)] text-white",
  "bg-[rgb(52,152,219)] text-white",
  "bg-[rgb(156,61,207)] text-white",
  "bg-[rgb(14,29,105)] text-white",
] as const;

const luoguDifficultyLabels = [
  "暂无评定",
  "入门",
  "普及-",
  "普及/提高-",
  "普及+/提高",
  "提高+/省选-",
  "省选/NOI-",
  "NOI/NOI+/CTSC",
] as const;

const problemTableColumnClassNames = {
  index: "w-10 whitespace-nowrap text-center",
  status: "w-24 whitespace-nowrap text-center",
} as const;

const getPidColumnWidthClassName = (maxPidLength: number) => {
  if (maxPidLength > 7) {
    return "w-24";
  }

  if (maxPidLength > 5) {
    return "w-[5.5rem]";
  }

  return "w-20";
};

const getPidColumnClassName = (problems: ProblemSetProblem[]) => {
  const maxPidLength = Math.max(
    0,
    ...problems.map((problem) => problem.pid.length)
  );
  const widthClassName = getPidColumnWidthClassName(maxPidLength);

  return `${widthClassName} whitespace-nowrap px-3 text-left`;
};

const getDifficultyLabel = (difficulty: null | number) => {
  if (difficulty === null) {
    return "-";
  }

  return luoguDifficultyLabels[difficulty] ?? `难度 ${difficulty}`;
};

const getDifficultyColumnWidthClassName = (
  maxDifficultyLabelLength: number
) => {
  if (maxDifficultyLabelLength >= luoguDifficultyLabels[7].length) {
    return "w-[8.5rem]";
  }

  if (maxDifficultyLabelLength >= luoguDifficultyLabels[4].length) {
    return "w-28";
  }

  return "w-20";
};

const getDifficultyColumnClassName = (problems: ProblemSetProblem[]) => {
  const maxDifficultyLabelLength = Math.max(
    0,
    ...problems.map((problem) => getDifficultyLabel(problem.difficulty).length)
  );
  const widthClassName = getDifficultyColumnWidthClassName(
    maxDifficultyLabelLength
  );

  return `${widthClassName} whitespace-nowrap text-center`;
};

const getLuoguProblemUrl = (pid: string) =>
  `https://www.luogu.com.cn/problem/${pid}`;

const getProfileUrl = (username: string) =>
  `/profile/${encodeURIComponent(username)}`;

const getProgressText = (problems: ProblemSetProblem[]) => {
  const hasAcceptedStatus = problems.some(
    (problem) => problem.accepted !== null
  );

  if (!hasAcceptedStatus) {
    return null;
  }

  const completedCount = problems.filter(
    (problem) => problem.accepted === true
  ).length;

  return {
    completedCount,
    totalCount: problems.length,
  };
};

function LinkedProblemText({
  children,
  href,
  isTruncated = false,
  title,
}: {
  children: ReactNode;
  href: string;
  isTruncated?: boolean;
  title?: string;
}) {
  return (
    <a
      className={`inline-flex min-w-0 font-medium text-accent underline-offset-4 hover:underline focus-visible:underline ${
        isTruncated ? "max-w-full" : "whitespace-nowrap"
      }`}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={title}
    >
      <span className={isTruncated ? "block min-w-0 truncate" : undefined}>
        {children}
      </span>
    </a>
  );
}

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
  if (!row.username) {
    return (
      <span className="inline-flex min-w-0 max-w-full justify-center">
        <span className="truncate">{row.displayName}</span>
        <CurrentUserSuffix isCurrentUser={isCurrentUser} />
      </span>
    );
  }

  return (
    <a
      className="inline-flex min-w-0 max-w-full items-center justify-center font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
      href={getProfileUrl(row.username)}
    >
      <span className="truncate">{row.displayName}</span>
      <CurrentUserSuffix isCurrentUser={isCurrentUser} />
    </a>
  );
}

const sortCompletionRows = (rows: ProblemSetCompletion[]) =>
  [...rows].sort((left, right) => {
    if (left.completedProblemCount !== right.completedProblemCount) {
      return right.completedProblemCount - left.completedProblemCount;
    }

    const displayNameOrder = left.displayName.localeCompare(
      right.displayName,
      "zh-CN"
    );

    if (displayNameOrder !== 0) {
      return displayNameOrder;
    }

    return left.userId.localeCompare(right.userId);
  });

function ProblemStatusChip({ accepted }: ProblemStatusChipProps) {
  if (accepted === true) {
    return (
      <Chip
        className="bg-success-soft px-3 py-1 text-sm text-success"
        size="md"
        variant="soft"
      >
        <CheckCircle2 className="size-4" />
        已通过
      </Chip>
    );
  }

  if (accepted === false) {
    return (
      <Chip
        className="bg-default px-3 py-1 text-muted text-sm"
        size="md"
        variant="soft"
      >
        <CircleX className="size-4" />
        未通过
      </Chip>
    );
  }

  return (
    <Chip
      className="bg-default px-3 py-1 text-muted text-sm"
      size="md"
      variant="soft"
    >
      <CircleMinus className="size-4" />
      未判定
    </Chip>
  );
}

function CenteredTableChip({ children }: { children: ReactNode }) {
  return <div className="flex justify-center">{children}</div>;
}

function DifficultyChip({ difficulty }: DifficultyChipProps) {
  if (difficulty === null) {
    return <span className="text-muted">-</span>;
  }

  const className =
    luoguDifficultyClassNames[difficulty] ?? luoguDifficultyClassNames[0];
  const label = getDifficultyLabel(difficulty);

  return (
    <Chip className={`${className} font-semibold`} size="md" variant="soft">
      {label}
    </Chip>
  );
}

function ProblemTable({ problems }: ProblemTableProps) {
  const progress = getProgressText(problems);
  const pidColumnClassName = getPidColumnClassName(problems);
  const difficultyColumnClassName = getDifficultyColumnClassName(problems);

  return (
    <Card>
      <Card.Header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <Card.Title>题目清单</Card.Title>
        <p className="justify-self-end pr-1 text-muted text-sm sm:pr-2">
          {progress ? (
            <>
              已完成{" "}
              <span className="font-semibold text-foreground">
                {progress.completedCount}
              </span>{" "}
              /{" "}
              <span className="font-semibold text-foreground">
                {progress.totalCount}
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {problems.length}
              </span>{" "}
              题
            </>
          )}
        </p>
      </Card.Header>
      <Card.Content>
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label="题单题目表格"
              className="min-w-[40rem] table-fixed"
            >
              <Table.Header>
                <Table.Column
                  className={problemTableColumnClassNames.index}
                  isRowHeader
                >
                  #
                </Table.Column>
                <Table.Column className={problemTableColumnClassNames.status}>
                  状态
                </Table.Column>
                <Table.Column className={pidColumnClassName}>PID</Table.Column>
                <Table.Column>标题</Table.Column>
                <Table.Column className={difficultyColumnClassName}>
                  难度
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {problems.map((problem, index) => {
                  const href = getLuoguProblemUrl(problem.pid);

                  return (
                    <Table.Row
                      className="h-14"
                      id={problem.pid}
                      key={problem.pid}
                      textValue={`${problem.pid} ${problem.title}`}
                    >
                      <Table.Cell
                        className={`${problemTableColumnClassNames.index} text-muted`}
                      >
                        {index + 1}
                      </Table.Cell>
                      <Table.Cell
                        className={problemTableColumnClassNames.status}
                      >
                        <CenteredTableChip>
                          <ProblemStatusChip accepted={problem.accepted} />
                        </CenteredTableChip>
                      </Table.Cell>
                      <Table.Cell
                        className={`${pidColumnClassName} font-mono text-sm`}
                      >
                        <LinkedProblemText href={href}>
                          {problem.pid}
                        </LinkedProblemText>
                      </Table.Cell>
                      <Table.Cell className="min-w-0 overflow-hidden">
                        <LinkedProblemText
                          href={href}
                          isTruncated
                          title={problem.title}
                        >
                          {problem.title}
                        </LinkedProblemText>
                      </Table.Cell>
                      <Table.Cell className={difficultyColumnClassName}>
                        <CenteredTableChip>
                          <DifficultyChip difficulty={problem.difficulty} />
                        </CenteredTableChip>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}

function CompletionLeaderboardCard({ problemSetId }: { problemSetId: string }) {
  const session = authClient.useSession();
  const currentUserId = session.data?.user.id ?? null;
  const completionsQuery = useQuery(
    trpc.problemSet.completions.queryOptions({ id: problemSetId })
  );
  const rows = useMemo(
    () => sortCompletionRows(completionsQuery.data ?? []),
    [completionsQuery.data]
  );

  return (
    <Card>
      <Card.Header>
        <Card.Title>题单完成榜</Card.Title>
      </Card.Header>
      <Card.Content>
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
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content aria-label="题单完成榜" className="min-w-[240px]">
                <Table.Header>
                  <Table.Column className="w-12 text-center">#</Table.Column>
                  <Table.Column className="text-center" isRowHeader>
                    姓名
                  </Table.Column>
                  <Table.Column className="w-20 text-center">
                    过题数
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {rows.map((row, index) => {
                    const isCurrentUser = row.userId === currentUserId;
                    const currentUserLabel = isCurrentUser ? " 我" : "";

                    return (
                      <Table.Row
                        className={isCurrentUser ? "bg-accent-soft/60" : ""}
                        id={row.userId}
                        key={row.userId}
                        textValue={`${row.displayName}${currentUserLabel} ${row.completedProblemCount}`}
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

function SummaryPanel({
  descriptionMarkdown,
  problemSetId,
}: SummaryPanelProps) {
  return (
    <aside className="grid content-start gap-4">
      <Card>
        <Card.Header>
          <Card.Title>题单说明</Card.Title>
        </Card.Header>
        <Card.Content>
          <MarkdownContent
            emptyText="暂无题单说明。"
            markdown={descriptionMarkdown}
          />
        </Card.Content>
      </Card>
      <CompletionLeaderboardCard problemSetId={problemSetId} />
    </aside>
  );
}

export default function ProblemSetDetailPage({
  params,
}: ProblemSetDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const problemSetQuery = useQuery(trpc.problemSet.get.queryOptions({ id }));
  const problemSet = problemSetQuery.data;
  const title = problemSet?.title ?? "题单";
  const description = problemSet
    ? `${problemSet.problems.length} 题`
    : "题单详情";

  return (
    <AppShell
      action={
        <Button
          onPress={() => router.push("/problem-sets" as Route)}
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="size-4" />
          返回题单
        </Button>
      }
      description={description}
      icon={<ListChecks className="size-4" />}
      title={title}
    >
      {problemSetQuery.isPending ? (
        <div className="flex items-center gap-3">
          <Spinner color="current" size="sm" />
          <p className="font-medium">正在加载题单详情。</p>
        </div>
      ) : null}

      {problemSetQuery.isError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>题单加载失败</Alert.Title>
            <Alert.Description>请返回题单列表后重试。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {problemSet ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
          <div className="order-2 min-w-0 lg:order-1">
            <ProblemTable problems={problemSet.problems} />
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            <SummaryPanel
              descriptionMarkdown={problemSet.descriptionMarkdown}
              problemSetId={problemSet.id}
            />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
