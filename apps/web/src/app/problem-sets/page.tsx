"use client";

import { Alert, Button, Card, Spinner, Tooltip } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, ListChecks, Plus } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

interface ProblemSetCardProps {
  completedProblemCount: null | number;
  id: string;
  problemCount: number;
  title: string;
}

const formatProgress = (
  completedProblemCount: null | number,
  problemCount: number
) => {
  if (completedProblemCount === null) {
    return null;
  }

  return `已完成 ${completedProblemCount} / ${problemCount}`;
};

function ProblemSetCard({
  completedProblemCount,
  id,
  problemCount,
  title,
}: ProblemSetCardProps) {
  const router = useRouter();
  const progressText = formatProgress(completedProblemCount, problemCount);

  return (
    <button
      className="group rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={() => router.push(`/problem-sets/${id}` as Route)}
      type="button"
    >
      <Card className="h-full transition-colors group-hover:border-accent/50">
        <Card.Header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Card.Description>洛谷题单</Card.Description>
            <Card.Title className="wrap-break-word mt-1 text-lg leading-snug">
              {title}
            </Card.Title>
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </Card.Header>

        <Card.Content>
          <dl className="grid gap-3">
            <div className="rounded-lg border border-border bg-surface-secondary p-3">
              <dt className="text-muted text-sm">题目数量</dt>
              <dd className="mt-1 font-semibold text-2xl text-foreground">
                {problemCount}
              </dd>
            </div>

            {progressText ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                <span>{progressText}</span>
              </div>
            ) : (
              <p className="text-muted text-sm">
                登录并绑定洛谷账号后显示完成情况
              </p>
            )}
          </dl>
        </Card.Content>
      </Card>
    </button>
  );
}

function CreateProblemSetButton() {
  const router = useRouter();
  const session = authClient.useSession();
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(session.data?.user),
    })
  );
  const isAdmin = accountMe.data?.role === "admin";

  if (!isAdmin) {
    return null;
  }

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="fixed right-5 bottom-5 z-40 sm:right-8 sm:bottom-8">
        <Button
          aria-label="新建题单"
          className="size-14 rounded-full shadow-accent/20 shadow-lg"
          isIconOnly
          onPress={() => router.push("/admin/problem-sets/import" as Route)}
        >
          <Plus className="size-6" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content placement="top" showArrow>
        <Tooltip.Arrow />
        新建题单
      </Tooltip.Content>
    </Tooltip>
  );
}

export default function ProblemSetsPage() {
  const problemSetsQuery = useQuery(trpc.problemSet.list.queryOptions());
  const problemSets = problemSetsQuery.data ?? [];

  return (
    <AppShell
      description="站内维护的洛谷训练题单"
      icon={<ListChecks className="size-4" />}
      title="题单"
    >
      <div className="grid gap-4">
        {problemSetsQuery.isPending ? (
          <div className="flex items-center gap-3">
            <Spinner color="current" size="sm" />
            <p className="font-medium">正在加载题单。</p>
          </div>
        ) : null}

        {problemSetsQuery.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>题单加载失败</Alert.Title>
              <Alert.Description>请稍后刷新页面重试。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {!(problemSetsQuery.isPending || problemSetsQuery.isError) &&
        problemSets.length === 0 ? (
          <Card>
            <Card.Content className="py-8">
              <div className="grid place-items-center gap-2 text-center">
                <ListChecks className="size-8 text-muted" />
                <p className="font-medium">暂无题单</p>
                <p className="text-muted text-sm">
                  管理员创建题单后会显示在这里。
                </p>
              </div>
            </Card.Content>
          </Card>
        ) : null}

        {problemSets.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {problemSets.map((problemSet) => (
              <ProblemSetCard
                completedProblemCount={problemSet.completedProblemCount}
                id={problemSet.id}
                key={problemSet.id}
                problemCount={problemSet.problemCount}
                title={problemSet.title}
              />
            ))}
          </div>
        ) : null}
      </div>
      <CreateProblemSetButton />
    </AppShell>
  );
}
