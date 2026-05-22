"use client";

import { Alert, Button, Card, Chip } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Sparkles, Trophy } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { MarkdownContent } from "@/components/markdown-content";
import { trpc } from "@/utils/trpc";

const healthChipColor = {
  danger: "danger",
  default: "default",
  success: "success",
  warning: "warning",
} as const;

type HealthTone = keyof typeof healthChipColor;

interface OverviewDetail {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

interface HomeNoticeCardProps {
  markdown: string;
}

interface OverviewSectionProps {
  children: ReactNode;
  title: string;
}

interface SystemOverviewCardProps {
  activeUsers: number;
  healthDetails: OverviewDetail[];
  healthMessage?: string;
  healthStatus: string;
  healthTone: HealthTone;
  isError: boolean;
  isLoading: boolean;
  selectionUsers: number;
  totalUsers: number;
}

const getHealthStatus = (isLoading: boolean, isError: boolean) => {
  if (isLoading) {
    return "连接中";
  }

  if (isError) {
    return "不可用";
  }

  return "在线";
};

const getHealthTone = (isLoading: boolean, isError: boolean) => {
  if (isLoading) {
    return "warning" as const;
  }

  if (isError) {
    return "danger" as const;
  }

  return "success" as const;
};

const formatCheckedAt = (checkedAt: string | undefined) => {
  if (!checkedAt) {
    return "-";
  }

  return new Date(checkedAt).toLocaleString("zh-CN", {
    hour12: false,
  });
};

const formatUptime = (uptimeMs: number | undefined) => {
  if (typeof uptimeMs !== "number") {
    return "-";
  }

  const totalSeconds = Math.max(0, Math.floor(uptimeMs / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} 天 ${hours} 小时`;
  }

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }

  if (minutes > 0) {
    return `${minutes} 分钟 ${seconds} 秒`;
  }

  return `${seconds} 秒`;
};

function HomeNoticeCard({ markdown }: HomeNoticeCardProps) {
  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-xl">队伍公告</Card.Title>
      </Card.Header>
      <Card.Content>
        <MarkdownContent emptyText="暂无公告。" markdown={markdown} />
      </Card.Content>
    </Card>
  );
}

function OverviewSection({ children, title }: OverviewSectionProps) {
  return (
    <div className="grid gap-3">
      <p className="font-medium text-foreground text-sm">{title}</p>
      {children}
    </div>
  );
}

function SystemOverviewCard({
  activeUsers,
  healthDetails,
  healthMessage,
  healthStatus,
  healthTone,
  isError,
  isLoading,
  selectionUsers,
  totalUsers,
}: SystemOverviewCardProps) {
  const totalValue = isLoading ? "-" : totalUsers;
  const selectionValue = isLoading ? "-" : selectionUsers;
  const activeValue = isLoading ? "-" : activeUsers;
  const memberDetails = [
    { label: "总用户", value: totalValue },
    { label: "选拔中", value: selectionValue },
    { label: "服役中", value: activeValue },
  ];

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between gap-4">
          <Card.Title className="text-xl">系统概览</Card.Title>
          <Chip color={healthChipColor[healthTone]} size="md" variant="soft">
            {healthStatus}
          </Chip>
        </div>
      </Card.Header>

      <Card.Content className="grid gap-5">
        <OverviewSection title="成员">
          <dl className="grid divide-y divide-border">
            {memberDetails.map((detail) => (
              <div
                className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                key={detail.label}
              >
                <dt className="text-muted text-sm">{detail.label}</dt>
                <dd className="font-semibold text-foreground">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>

          {isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>用户统计加载失败。</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </OverviewSection>

        <OverviewSection title="服务">
          <dl className="grid divide-y divide-border">
            {healthDetails.map((detail) => (
              <div
                className="grid gap-1 py-2 first:pt-0 last:pb-0"
                key={detail.label}
              >
                <dt className="text-muted text-sm">{detail.label}</dt>
                <dd
                  className={clsx(
                    "break-all font-medium text-foreground",
                    detail.mono ? "font-mono text-sm" : "text-sm"
                  )}
                >
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </OverviewSection>

        {healthMessage ? (
          <Alert status={healthTone === "danger" ? "danger" : "default"}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{healthMessage}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function QuickLinksCard() {
  const router = useRouter();

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Description>常用入口</Card.Description>
          <Card.Title className="mt-1">公开榜单</Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4">
        <Button
          className="justify-start"
          onPress={() => router.push("/rank/codeforces" as Route)}
          size="lg"
          variant="outline"
        >
          <Trophy className="size-4" />
          Codeforces 排行榜
        </Button>
        <Button
          className="justify-start"
          onPress={() => router.push("/rank/luogu" as Route)}
          size="lg"
          variant="outline"
        >
          <Trophy className="size-4" />
          洛谷排行榜
        </Button>
      </Card.Content>
    </Card>
  );
}

export default function Home() {
  const health = useQuery(trpc.health.queryOptions());
  const homeNotice = useQuery(trpc.dashboard.homeNotice.queryOptions());
  const dashboardSummary = useQuery(trpc.dashboard.summary.queryOptions());
  const status = getHealthStatus(health.isLoading, health.isError);
  const healthTone = getHealthTone(health.isLoading, health.isError);

  return (
    <AppShell
      description="队务工作台"
      icon={<Sparkles className="size-4" />}
      title="HHUACM Dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-6">
          <HomeNoticeCard markdown={homeNotice.data?.markdown ?? ""} />
          <QuickLinksCard />
        </div>

        <SystemOverviewCard
          activeUsers={dashboardSummary.data?.activeUsers ?? 0}
          healthDetails={[
            { label: "服务名称", value: health.data?.service ?? "-" },
            {
              label: "运行时",
              value: health.data
                ? `${health.data.runtime.name} ${health.data.runtime.version}`
                : "-",
            },
            {
              label: "系统",
              value: health.data
                ? `${health.data.system.platform} ${health.data.system.arch} ${health.data.system.release}`
                : "-",
            },
            {
              label: "运行时长",
              value: formatUptime(health.data?.uptimeMs),
            },
            {
              label: "检查时间",
              mono: true,
              value: formatCheckedAt(health.data?.checkedAt),
            },
          ]}
          healthMessage={
            health.isError
              ? "后端暂时不可用。启动 API 服务后这里会自动恢复。"
              : undefined
          }
          healthStatus={status}
          healthTone={healthTone}
          isError={dashboardSummary.isError}
          isLoading={dashboardSummary.isLoading}
          selectionUsers={dashboardSummary.data?.selectionUsers ?? 0}
          totalUsers={dashboardSummary.data?.totalUsers ?? 0}
        />
      </div>
    </AppShell>
  );
}
