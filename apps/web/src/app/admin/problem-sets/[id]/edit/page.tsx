"use client";

import { Alert, Button, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ListChecks } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { use } from "react";

import { AppShell } from "@/components/app-shell";
import { trpc } from "@/utils/trpc";
import { ProblemSetEditor } from "./_components/problem-set-editor";

interface AdminProblemSetEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AdminProblemSetEditPage({
  params,
}: AdminProblemSetEditPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const problemSetQuery = useQuery(trpc.problemSet.get.queryOptions({ id }));
  const shellAction = (
    <Button
      onPress={() => router.push(`/problem-sets/${id}` as Route)}
      size="sm"
      variant="outline"
    >
      <ArrowLeft className="size-4" />
      返回题单
    </Button>
  );

  return (
    <AppShell
      action={shellAction}
      description="管理员控制台"
      icon={<ListChecks className="size-4" />}
      maxWidth="5xl"
      title="编辑题单"
    >
      <div className="grid gap-6">
        {problemSetQuery.isPending ? (
          <div className="flex items-center gap-3">
            <Spinner color="current" size="sm" />
            <p className="font-medium">正在加载题单。</p>
          </div>
        ) : null}

        {problemSetQuery.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>题单加载失败</Alert.Title>
              <Alert.Description>请返回题单详情后重试。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {problemSetQuery.data ? (
          <ProblemSetEditor
            key={problemSetQuery.data.id}
            problemSet={problemSetQuery.data}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
