"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Dropdown,
  Label,
  Separator,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type Key, type ReactNode, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient, getPreferredUsername } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

const USERNAME_VISIBLE_LENGTH = 20;

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

interface AccountMenuProps {
  displayName: string;
  isAdmin: boolean;
  onLogout: () => Promise<void>;
  username: null | string | undefined;
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

const formatDisplayName = (username: string) => {
  if (username.length <= USERNAME_VISIBLE_LENGTH) {
    return username;
  }

  return `${username.slice(0, USERNAME_VISIBLE_LENGTH)}…`;
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

function AccountMenu({
  displayName,
  isAdmin,
  onLogout,
  username,
}: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    onLogout().catch(() => undefined);
  };

  const handleAction = (key: Key) => {
    if (key === "profile") {
      setOpen(false);
      router.push(username ? (`/profile/${username}` as Route) : "/profile");
      return;
    }

    if (key === "settings") {
      setOpen(false);
      router.push("/settings/profile" as Route);
      return;
    }

    if (key === "admin") {
      setOpen(false);
      router.push("/admin" as Route);
      return;
    }

    if (key === "logout") {
      handleLogout();
    }
  };

  return (
    <Dropdown isOpen={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <Button
        aria-label="打开账号菜单"
        className="max-w-56 justify-start"
        size="lg"
        variant="outline"
      >
        <UserRound className="size-4" />
        <span className="max-w-44 overflow-hidden text-ellipsis">
          {displayName}
        </span>
      </Button>
      <Dropdown.Popover className="min-w-44" placement="bottom end">
        <Dropdown.Menu onAction={handleAction}>
          <Dropdown.Item id="profile" textValue="个人主页">
            <UserRound className="size-4" />
            <Label>个人主页</Label>
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue="资料设置">
            <Settings className="size-4" />
            <Label>资料设置</Label>
          </Dropdown.Item>
          {isAdmin ? (
            <Dropdown.Item id="admin" textValue="管理面板">
              <LayoutDashboard className="size-4" />
              <Label>管理面板</Label>
            </Dropdown.Item>
          ) : null}
          <Separator />
          <Dropdown.Item id="logout" textValue="注销" variant="danger">
            <LogOut className="size-4" />
            <Label>注销</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

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

export default function Home() {
  const router = useRouter();
  const health = useQuery(trpc.health.queryOptions());
  const dashboardSummary = useQuery(trpc.dashboard.summary.queryOptions());
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
    })
  );
  const displayUsername = user ? getPreferredUsername(user) : "";
  const isAdmin = accountMe.data?.role === "admin";
  const status = getHealthStatus(health.isLoading, health.isError);
  const healthTone = getHealthTone(health.isLoading, health.isError);

  const handleLogout = async () => {
    await authClient.signOut();
    await session.refetch();
  };

  const headerAction = user ? (
    <AccountMenu
      displayName={formatDisplayName(displayUsername)}
      isAdmin={isAdmin}
      onLogout={handleLogout}
      username={user.username}
    />
  ) : (
    <div className="flex items-center gap-2">
      <Button onPress={() => router.push("/login")} variant="ghost">
        登录
      </Button>
      <Button onPress={() => router.push("/register")}>注册</Button>
    </div>
  );

  return (
    <AppShell
      action={headerAction}
      description="队务工作台"
      icon={<Sparkles className="size-4" />}
      title="HHUACM Dashboard"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <TeamSummaryCard
          activeUsers={dashboardSummary.data?.activeUsers ?? 0}
          isError={dashboardSummary.isError}
          isLoading={dashboardSummary.isLoading}
          selectionUsers={dashboardSummary.data?.selectionUsers ?? 0}
          totalUsers={dashboardSummary.data?.totalUsers ?? 0}
        />

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
