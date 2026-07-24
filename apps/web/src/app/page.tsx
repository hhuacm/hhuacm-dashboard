"use client";

import { Alert, Button, Card, Chip } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Sparkles, Trophy, UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { MarkdownContent } from "@/components/markdown-content";
import { trpc } from "@/utils/trpc";

type HealthTone = "danger" | "success" | "warning";

interface HealthPresentation {
  label: string;
  tone: HealthTone;
}

interface OverviewDetail {
  label: string;
  value: ReactNode;
}

interface HomeNoticeCardProps {
  markdown: string;
}

interface BuildRevisionProps {
  committedAt: null | string;
  revision: string;
}

interface OverviewSectionProps {
  children: ReactNode;
  title: string;
}

interface SystemOverviewCardProps {
  activeUsers: number;
  health: HealthPresentation;
  healthDetails: OverviewDetail[];
  healthMessage?: string;
  isError: boolean;
  isLoading: boolean;
  selectionUsers: number;
  totalUsers: number;
}

const getHealthPresentation = (
  isLoading: boolean,
  isError: boolean
): HealthPresentation => {
  if (isLoading) {
    return {
      label: "连接中",
      tone: "warning",
    };
  }

  if (isError) {
    return {
      label: "不可用",
      tone: "danger",
    };
  }

  return {
    label: "在线",
    tone: "success",
  };
};

const formatDateTime = (value: null | string | undefined) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
};

function BuildRevision({ committedAt, revision }: BuildRevisionProps) {
  const label = revision === "local" ? revision : revision.slice(0, 7);
  const title = committedAt
    ? `${revision}\n提交时间：${formatDateTime(committedAt)}`
    : revision;

  if (revision === "local") {
    return <span title={title}>{label}</span>;
  }

  return (
    <a
      className="text-accent underline-offset-4 hover:underline focus-visible:underline"
      href={`https://github.com/hhuacm/hhuacm-dashboard/commit/${revision}`}
      rel="noreferrer"
      target="_blank"
      title={title}
    >
      {label}
    </a>
  );
}

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
  health,
  healthDetails,
  healthMessage,
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
          <Chip color={health.tone} size="md" variant="soft">
            {health.label}
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
                <dd className="break-all font-medium text-foreground text-sm">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </OverviewSection>

        {healthMessage ? (
          <Alert status={health.tone === "danger" ? "danger" : "default"}>
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
          <Card.Title className="mt-1">常用入口</Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="grid gap-5">
        <OverviewSection title="个人与练习">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="w-full justify-start"
              onPress={() => router.push("/problem-sets" as Route)}
              size="lg"
              variant="outline"
            >
              <ListChecks className="size-4" />
              题单
            </Button>
            <Button
              className="w-full justify-start"
              onPress={() => router.push("/profile" as Route)}
              size="lg"
              variant="outline"
            >
              <UserRound className="size-4" />
              个人主页
            </Button>
          </div>
        </OverviewSection>

        <OverviewSection title="排行榜">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="w-full justify-start"
              onPress={() => router.push("/rank/codeforces" as Route)}
              size="lg"
              variant="outline"
            >
              <Trophy className="size-4" />
              Codeforces
            </Button>
            <Button
              className="w-full justify-start"
              onPress={() => router.push("/rank/atcoder" as Route)}
              size="lg"
              variant="outline"
            >
              <Trophy className="size-4" />
              AtCoder
            </Button>
            <Button
              className="w-full justify-start"
              onPress={() => router.push("/rank/luogu" as Route)}
              size="lg"
              variant="outline"
            >
              <Trophy className="size-4" />
              洛谷
            </Button>
            <Button
              className="w-full justify-start"
              onPress={() => router.push("/rank/nowcoder" as Route)}
              size="lg"
              variant="outline"
            >
              <Trophy className="size-4" />
              牛客
            </Button>
          </div>
        </OverviewSection>
      </Card.Content>
    </Card>
  );
}

export default function Home() {
  const health = useQuery(trpc.health.queryOptions());
  const homeNotice = useQuery(trpc.dashboard.homeNotice.queryOptions());
  const dashboardSummary = useQuery(trpc.dashboard.summary.queryOptions());
  const healthPresentation = getHealthPresentation(
    health.isLoading,
    health.isError
  );

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
          health={healthPresentation}
          healthDetails={[
            { label: "服务名称", value: health.data?.service ?? "-" },
            {
              label: "代码版本",
              value: health.data ? (
                <BuildRevision {...health.data.build} />
              ) : (
                "-"
              ),
            },
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
          ]}
          healthMessage={
            health.isError
              ? "后端暂时不可用。启动 API 服务后这里会自动恢复。"
              : undefined
          }
          isError={dashboardSummary.isError}
          isLoading={dashboardSummary.isLoading}
          selectionUsers={dashboardSummary.data?.selectionUsers ?? 0}
          totalUsers={dashboardSummary.data?.totalUsers ?? 0}
        />
      </div>
    </AppShell>
  );
}
