"use client";

import { Alert, Button, Spinner } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ListChecks, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";
import { ProblemSetDeleteDialog } from "./_components/problem-set-delete-dialog";
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
  const queryClient = useQueryClient();
  const { id } = use(params);
  const session = authClient.useSession();
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(session.data?.user),
    })
  );
  const problemSetQuery = useQuery(trpc.problemSet.get.queryOptions({ id }));
  const problemSet = problemSetQuery.data;
  const title = problemSet?.title ?? "题单";
  const description = problemSet
    ? `${problemSet.problems.length} 题`
    : "题单详情";
  const isAdmin = accountMe.data?.role === "admin";
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationValue, setDeleteConfirmationValue] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<null | string>(
    null
  );
  const deleteProblemSet = useMutation(
    trpc.admin.problemSets.delete.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.problemSet.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.problemSet.get.queryKey({ id }),
          }),
        ]);
        router.push("/problem-sets" as Route);
      },
    })
  );

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmationValue("");
    setDeleteErrorMessage(null);
  };

  const handleDeleteConfirm = async () => {
    if (!problemSet) {
      return;
    }

    setDeleteErrorMessage(null);

    try {
      await deleteProblemSet.mutateAsync({ id: problemSet.id });
    } catch {
      setDeleteErrorMessage("删除失败，请稍后重试。");
    }
  };

  return (
    <AppShell
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isAdmin && problemSet ? (
            <Button
              className="border-danger/20 bg-danger-soft/45 text-danger hover:bg-danger-soft/65"
              onPress={() => setIsDeleteDialogOpen(true)}
              size="sm"
              variant="outline"
            >
              <Trash2 className="size-4" />
              删除
            </Button>
          ) : null}
          <Button
            onPress={() => router.push("/problem-sets" as Route)}
            size="sm"
            variant="outline"
          >
            <ArrowLeft className="size-4" />
            返回题单
          </Button>
        </div>
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
      <ProblemSetDeleteDialog
        confirmationValue={deleteConfirmationValue}
        errorMessage={deleteErrorMessage}
        isDeleting={deleteProblemSet.isPending}
        isOpen={isDeleteDialogOpen}
        onCancel={closeDeleteDialog}
        onConfirm={handleDeleteConfirm}
        onConfirmationChange={(value) => {
          setDeleteConfirmationValue(value);
          setDeleteErrorMessage(null);
        }}
        title={problemSet?.title ?? ""}
      />
    </AppShell>
  );
}
