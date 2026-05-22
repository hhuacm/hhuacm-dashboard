import { Card, Table } from "@heroui/react";
import clsx from "clsx";
import type { ReactNode } from "react";

import {
  getDifficultyColumnClassName,
  getLuoguProblemUrl,
  getPidColumnClassName,
  getProgressText,
  type ProblemSetProblem,
  problemTableColumnClassNames,
} from "../_model/problem-set-detail-view";
import {
  CenteredTableChip,
  DifficultyChip,
  ProblemStatusChip,
} from "./problem-status";

interface ProblemTableProps {
  problems: ProblemSetProblem[];
}

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
      className={clsx(
        "inline-flex min-w-0 font-medium text-accent underline-offset-4 hover:underline focus-visible:underline",
        isTruncated ? "max-w-full" : "whitespace-nowrap"
      )}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={title}
    >
      <span className={clsx(isTruncated && "block min-w-0 truncate")}>
        {children}
      </span>
    </a>
  );
}

export function ProblemTable({ problems }: ProblemTableProps) {
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
              className="min-w-160 table-fixed"
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
                        className={clsx(
                          problemTableColumnClassNames.index,
                          "text-muted"
                        )}
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
                        className={clsx(
                          pidColumnClassName,
                          "font-mono text-sm"
                        )}
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
