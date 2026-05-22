"use client";

import { Alert, Button, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ListChecks } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { use } from "react";

import { AppShell } from "@/components/app-shell";
import { trpc } from "@/utils/trpc";
import { ProblemTable } from "./_components/problem-table";
import { SummaryPanel } from "./_components/summary-panel";

interface ProblemSetDetailPageProps {
  params: Promise<{
    id: string;
  }>;
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
