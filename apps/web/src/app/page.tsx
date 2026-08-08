import { Alert, Card } from "@heroui/react";
import { ListChecks, Sparkles, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { MarkdownContent } from "@/components/markdown-content";
import { ServerAppShell } from "@/components/server-app-shell";
import { createServerRequest } from "@/utils/server-trpc";
import { getSystemInfo } from "@/utils/system-info";

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
  isError: boolean;
  selectionUsers: number;
  systemDetails: OverviewDetail[];
  totalUsers: number;
}

const formatDateTime = (value: null | string) => {
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
  isError,
  selectionUsers,
  systemDetails,
  totalUsers,
}: SystemOverviewCardProps) {
  const memberDetails = [
    { label: "总用户", value: totalUsers },
    { label: "选拔中", value: selectionUsers },
    { label: "服役中", value: activeUsers },
  ];

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-xl">系统概览</Card.Title>
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
            {systemDetails.map((detail) => (
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
      </Card.Content>
    </Card>
  );
}

function QuickLinksCard() {
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
            <Link
              className="button button--lg button--outline w-full justify-start"
              href="/problem-sets"
            >
              <ListChecks className="size-4" />
              题单
            </Link>
            <Link
              className="button button--lg button--outline w-full justify-start"
              href="/profile"
            >
              <UserRound className="size-4" />
              个人主页
            </Link>
          </div>
        </OverviewSection>

        <OverviewSection title="排行榜">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              className="button button--lg button--outline w-full justify-start"
              href="/rank/codeforces"
            >
              <Trophy className="size-4" />
              Codeforces
            </Link>
            <Link
              className="button button--lg button--outline w-full justify-start"
              href="/rank/atcoder"
            >
              <Trophy className="size-4" />
              AtCoder
            </Link>
            <Link
              className="button button--lg button--outline w-full justify-start"
              href="/rank/luogu"
            >
              <Trophy className="size-4" />
              洛谷
            </Link>
            <Link
              className="button button--lg button--outline w-full justify-start"
              href="/rank/nowcoder"
            >
              <Trophy className="size-4" />
              牛客
            </Link>
          </div>
        </OverviewSection>
      </Card.Content>
    </Card>
  );
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const { caller } = await createServerRequest();
  const systemInfo = getSystemInfo();
  const [homeNotice, dashboardSummary] = await Promise.all([
    caller.dashboard.homeNotice().catch(() => ({ markdown: "" })),
    caller.dashboard.summary().then(
      (summary) => ({ isError: false, summary }),
      () => ({ isError: true, summary: null })
    ),
  ]);

  return (
    <ServerAppShell
      description="队务工作台"
      icon={<Sparkles className="size-4" />}
      title="HHUACM Dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-6">
          <HomeNoticeCard markdown={homeNotice.markdown} />
          <QuickLinksCard />
        </div>

        <SystemOverviewCard
          activeUsers={dashboardSummary.summary?.activeUsers ?? 0}
          isError={dashboardSummary.isError}
          selectionUsers={dashboardSummary.summary?.selectionUsers ?? 0}
          systemDetails={[
            { label: "服务名称", value: systemInfo.service },
            {
              label: "代码版本",
              value: <BuildRevision {...systemInfo.build} />,
            },
            {
              label: "运行时",
              value: `${systemInfo.runtime.name} ${systemInfo.runtime.version}`,
            },
            {
              label: "系统",
              value: `${systemInfo.system.platform} ${systemInfo.system.arch} ${systemInfo.system.release}`,
            },
            {
              label: "运行时长",
              value: formatUptime(systemInfo.uptimeMs),
            },
          ]}
          totalUsers={dashboardSummary.summary?.totalUsers ?? 0}
        />
      </div>
    </ServerAppShell>
  );
}
