"use client";

import { Alert, Card, Spinner, Table } from "@heroui/react";
import { getUserNameLabel } from "@hhuacm-dashboard/domain";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useMemo } from "react";

import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";
import {
  getProfileUrl,
  type ProblemSetCompletion,
  sortCompletionRows,
} from "../_model/problem-set-detail-view";

const emptyText = "-";

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

export function CompletionLeaderboardCard({
  problemSetId,
}: {
  problemSetId: string;
}) {
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
                  {rows.map((row, index) => {
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
