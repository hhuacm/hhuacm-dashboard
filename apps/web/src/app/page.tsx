"use client";

import { Alert, Button, Card, Chip } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Trophy } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { trpc } from "@/utils/trpc";

const healthChipColor = {
  danger: "danger",
  default: "default",
  success: "success",
  warning: "warning",
} as const;

type HealthTone = keyof typeof healthChipColor;

interface HealthDetail {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

interface HomeInfoItemProps {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

interface TeamSummaryCardProps {
  activeUsers: number;
  isError: boolean;
  isLoading: boolean;
  selectionUsers: number;
  totalUsers: number;
}

interface ServiceHealthCardProps {
  details: HealthDetail[];
  message?: string;
  status: string;
  tone: HealthTone;
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

function HomeInfoItem({ label, mono = false, value }: HomeInfoItemProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-muted text-sm">{label}</dt>
      <dd
        className={`mt-2 break-all font-medium text-foreground ${
          mono ? "font-mono text-sm" : "text-base"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function TeamSummaryCard({
  activeUsers,
  isError,
  isLoading,
  selectionUsers,
  totalUsers,
}: TeamSummaryCardProps) {
  const totalValue = isLoading ? "-" : totalUsers;
  const selectionValue = isLoading ? "-" : selectionUsers;
  const activeValue = isLoading ? "-" : activeUsers;

  return (
    <Card>
      <Card.Header>
        <div>
          <Card.Description>队伍概览</Card.Description>
          <Card.Title className="mt-1">用户统计</Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-4">
        <dl className="grid gap-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <dt className="text-muted text-sm">总用户</dt>
            <dd className="mt-2 font-semibold text-4xl text-foreground">
              {totalValue}
            </dd>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-accent/20 bg-accent-soft p-4">
              <dt className="font-medium text-accent text-sm">选拔中</dt>
              <dd className="mt-2 font-semibold text-2xl text-accent">
                {selectionValue}
              </dd>
            </div>
            <div className="rounded-lg border border-success/20 bg-success-soft p-4">
              <dt className="font-medium text-sm text-success">服役中</dt>
              <dd className="mt-2 font-semibold text-2xl text-success">
                {activeValue}
              </dd>
            </div>
          </div>
        </dl>

        {isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>用户统计加载失败。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function ServiceHealthCard({
  details,
  message,
  status,
  tone,
}: ServiceHealthCardProps) {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Card.Description>服务状态</Card.Description>
            <Card.Title className="mt-1">API 连接</Card.Title>
          </div>
          <Chip color={healthChipColor[tone]} size="sm" variant="soft">
            {status}
          </Chip>
        </div>
      </Card.Header>

      <Card.Content className="grid gap-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {details.map((detail) => (
            <HomeInfoItem
              key={detail.label}
              label={detail.label}
              mono={detail.mono}
              value={detail.value}
            />
          ))}
        </dl>

        {message ? (
          <Alert status={tone === "danger" ? "danger" : "default"}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{message}</Alert.Description>
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
  const dashboardSummary = useQuery(trpc.dashboard.summary.queryOptions());
  const status = getHealthStatus(health.isLoading, health.isError);
  const healthTone = getHealthTone(health.isLoading, health.isError);

  return (
    <AppShell
      description="队务工作台"
      icon={<Sparkles className="size-4" />}
      title="HHUACM Dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-6">
          <TeamSummaryCard
            activeUsers={dashboardSummary.data?.activeUsers ?? 0}
            isError={dashboardSummary.isError}
            isLoading={dashboardSummary.isLoading}
            selectionUsers={dashboardSummary.data?.selectionUsers ?? 0}
            totalUsers={dashboardSummary.data?.totalUsers ?? 0}
          />

          <QuickLinksCard />
        </div>

        <ServiceHealthCard
          details={[
            { label: "服务", value: health.data?.service ?? "-" },
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
          message={
            health.isError
              ? "后端暂时不可用。启动 API 服务后这里会自动恢复。"
              : undefined
          }
          status={status}
          tone={healthTone}
        />
      </div>
    </AppShell>
  );
}
