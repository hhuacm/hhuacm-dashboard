"use client";

import { Alert, Button, Card, Spinner } from "@heroui/react";
import type { AppRouter } from "@hhuacm-dashboard/api/routers/index";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowLeft, Check, Clipboard, Download, FileJson } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";
import { AccessFeedback } from "../users/_components/access-feedback";
import { redirectDelayMs } from "../users/helpers";

const jsonIndent = 2;

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SystemExportData = RouterOutputs["admin"]["export"];

const formatExportFileTimestamp = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const getExportFilename = (exportedAt: string) =>
  `hhuacm-system-export-${formatExportFileTimestamp(new Date(exportedAt))}.json`;

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-surface-secondary p-4">
      <p className="text-muted text-sm">{label}</p>
      <p className="mt-1 font-semibold text-2xl">{value}</p>
    </div>
  );
}

function MetadataCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-surface-secondary p-4">
      <p className="text-muted text-sm">{label}</p>
      <p className="wrap-break-word mt-2 font-mono text-sm">{value}</p>
    </div>
  );
}

function ExportResult({
  data,
  exportJson,
}: {
  data: SystemExportData;
  exportJson: string;
}) {
  const userCount = data.seed.users.length;
  const problemSetCount = data.seed.problemSets.length;
  const settingCount = Object.keys(data.seed.settings).length;
  const isSeedEmpty =
    userCount === 0 && problemSetCount === 0 && settingCount === 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="用户数" value={userCount} />
        <StatCard label="题单数" value={problemSetCount} />
        <StatCard label="设置数" value={settingCount} />
        <StatCard label="版本" value={`v${data.version}`} />
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <MetadataCard label="导出时间" value={data.exportedAt} />
        <MetadataCard label="内容指纹" value={data.hash} />
      </div>
      {isSeedEmpty ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>暂无种子数据</Alert.Title>
            <Alert.Description>
              当前导出的种子骨架为空，没有需要复现的人工维护数据。
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className="overflow-hidden rounded-lg border bg-surface">
        <div className="border-b bg-surface-secondary px-4 py-3">
          <p className="font-medium text-sm">JSON 预览</p>
        </div>
        <pre className="max-h-160 overflow-auto p-4 text-sm leading-6">
          <code>{exportJson}</code>
        </pre>
      </div>
    </div>
  );
}

export default function AdminExportPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [isCopied, setIsCopied] = useState(false);
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
      retry: false,
    })
  );
  const isAdmin = accountMe.data?.role === "admin";
  const isMember = Boolean(accountMe.data && !isAdmin);
  const isCheckingAccess =
    session.isPending || (Boolean(user) && accountMe.isPending);
  const shouldPromptLogin = !(session.isPending || user);
  const exportQuery = useQuery(
    trpc.admin.export.queryOptions(undefined, {
      enabled: Boolean(isAdmin),
      retry: false,
    })
  );
  const exportJson = useMemo(
    () =>
      exportQuery.data
        ? JSON.stringify(exportQuery.data, null, jsonIndent)
        : "",
    [exportQuery.data]
  );
  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      const timeoutId = window.setTimeout(() => {
        router.push("/login?redirect=/admin/export");
      }, redirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }

    if (isMember) {
      const timeoutId = window.setTimeout(() => {
        router.push("/");
      }, redirectDelayMs);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isMember, router, session.isPending, user]);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeoutId = window.setTimeout(() => setIsCopied(false), 1800);

    return () => window.clearTimeout(timeoutId);
  }, [isCopied]);

  const handleCopy = async () => {
    if (!exportJson) {
      return;
    }

    await navigator.clipboard.writeText(exportJson);
    setIsCopied(true);
  };

  const handleDownload = () => {
    if (!(exportJson && exportQuery.data)) {
      return;
    }

    const blob = new Blob([exportJson], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getExportFilename(exportQuery.data.exportedAt);
    link.click();
    URL.revokeObjectURL(url);
  };

  const shellAction = (
    <Button
      onPress={() => router.push("/admin" as Route)}
      size="sm"
      variant="outline"
    >
      <ArrowLeft className="size-4" />
      返回管理面板
    </Button>
  );

  return (
    <AppShell
      action={shellAction}
      description="管理员控制台"
      icon={<FileJson className="size-4" />}
      maxWidth="6xl"
      title="系统导出"
    >
      <div className="grid gap-6">
        <AccessFeedback
          isAccessError={accountMe.isError}
          isCheckingAccess={isCheckingAccess}
          isMember={isMember}
          loginReturnLabel="系统导出"
          shouldPromptLogin={shouldPromptLogin}
        />

        {isAdmin ? (
          <Card>
            <Card.Header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Card.Title className="text-xl">系统最小种子文件</Card.Title>
                <Card.Description>
                  JSON 仅包含用户、OJ 账号标识、题单和非默认站点设置。
                </Card.Description>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  isDisabled={!exportJson}
                  onPress={handleCopy}
                  size="sm"
                  variant="outline"
                >
                  {isCopied ? (
                    <Check className="size-4" />
                  ) : (
                    <Clipboard className="size-4" />
                  )}
                  {isCopied ? "已复制" : "复制 JSON"}
                </Button>
                <Button
                  isDisabled={!exportJson}
                  onPress={handleDownload}
                  size="sm"
                >
                  <Download className="size-4" />
                  下载 JSON
                </Button>
              </div>
            </Card.Header>
            <Card.Content>
              {exportQuery.isPending ? (
                <div className="flex items-center gap-3">
                  <Spinner color="current" size="sm" />
                  <p className="font-medium">正在生成系统导出。</p>
                </div>
              ) : null}

              {exportQuery.isError ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>导出失败</Alert.Title>
                    <Alert.Description>请刷新页面后重试。</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {exportQuery.data ? (
                <ExportResult data={exportQuery.data} exportJson={exportJson} />
              ) : null}
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
