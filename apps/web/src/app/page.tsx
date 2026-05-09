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
  CheckCircle2,
  LogOut,
  Server,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type Key, type ReactNode, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { authClient, getPreferredUsername } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

const USERNAME_VISIBLE_LENGTH = 20;

const statusToneClassNames = {
  danger: "bg-danger-soft text-danger",
  info: "bg-accent-soft text-accent",
  neutral: "bg-default text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
} as const;

const healthChipColor = {
  danger: "danger",
  default: "default",
  success: "success",
  warning: "warning",
} as const;

type HealthTone = keyof typeof healthChipColor;
type StatusTone = keyof typeof statusToneClassNames;

interface HealthDetail {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

interface AccountMenuProps {
  displayName: string;
  onLogout: () => Promise<void>;
}

interface StatusSummaryCardProps {
  description: string;
  icon?: ReactNode;
  title: string;
  tone?: StatusTone;
  value: ReactNode;
}

interface HomeInfoItemProps {
  label: string;
  mono?: boolean;
  value: ReactNode;
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

const getAuthStatus = (isPending: boolean, isSignedIn: boolean) => {
  if (isPending) {
    return "检查中";
  }

  if (isSignedIn) {
    return "已登录";
  }

  return "访客";
};

const formatCheckedAt = (checkedAt: string | undefined) => {
  if (!checkedAt) {
    return "-";
  }

  return new Date(checkedAt).toLocaleString("zh-CN", {
    hour12: false,
  });
};

function AccountMenu({ displayName, onLogout }: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    onLogout().catch(() => undefined);
  };

  const handleAction = (key: Key) => {
    if (key === "profile") {
      setOpen(false);
      router.push("/profile");
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
          <Dropdown.Item id="profile" textValue="个人信息">
            <UserRound className="size-4" />
            <Label>个人信息</Label>
          </Dropdown.Item>
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

function StatusSummaryCard({
  description,
  icon,
  title,
  tone = "neutral",
  value,
}: StatusSummaryCardProps) {
  return (
    <Card>
      <Card.Header className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Card.Description>{title}</Card.Description>
            <Card.Title className="mt-1 text-xl">{value}</Card.Title>
          </div>
          {icon ? (
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-md ${statusToneClassNames[tone]}`}
            >
              {icon}
            </div>
          ) : null}
        </div>
      </Card.Header>
      <Card.Content>
        <p className="text-muted text-sm leading-6">{description}</p>
      </Card.Content>
    </Card>
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
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const username = user ? getPreferredUsername(user) : "";
  const status = getHealthStatus(health.isLoading, health.isError);
  const healthTone = getHealthTone(health.isLoading, health.isError);
  const authStatus = getAuthStatus(session.isPending, Boolean(user));

  const handleLogout = async () => {
    await authClient.signOut();
    await session.refetch();
  };

  const headerAction = user ? (
    <AccountMenu
      displayName={formatDisplayName(username)}
      onLogout={handleLogout}
    />
  ) : (
    <div className="flex items-center gap-2">
      <Button onPress={() => router.push("/login")} variant="ghost">
        登录
      </Button>
      <Button onPress={() => router.push("/register")}>注册</Button>
    </div>
  );

  const mainAction = user ? (
    <Button onPress={() => router.push("/profile")} size="lg">
      <UserRound className="size-4" />
      进入个人信息
    </Button>
  ) : undefined;

  return (
    <AppShell
      action={headerAction}
      description="竞赛与团队运营后台"
      icon={<Sparkles className="size-4" />}
      title="HHUACM Dashboard"
    >
      <div className="grid gap-8">
        <PageHeader
          action={mainAction}
          description="用于队内账号入口、个人信息维护和服务连通状态检查。后续业务模块接入后，这里将成为队务操作的统一入口。"
          eyebrow="河海大学 ACM 队"
          title="清晰可靠的队务工作台"
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid content-start gap-6">
            <div className="grid gap-4 md:grid-cols-3">
              <StatusSummaryCard
                description={
                  user ? "当前会话可访问个人信息页。" : "登录后可维护个人信息。"
                }
                icon={<UserRound className="size-4" />}
                title="账号状态"
                tone={user ? "success" : "neutral"}
                value={authStatus}
              />
              <StatusSummaryCard
                description={
                  health.isError
                    ? "无法连接 API 服务。"
                    : "用于确认前后端连通。"
                }
                icon={<Server className="size-4" />}
                title="API 状态"
                tone={healthTone}
                value={status}
              />
              <StatusSummaryCard
                description={
                  user
                    ? "可查看并更新姓名、年级、学号和专业。"
                    : "登录后启用个人信息维护。"
                }
                icon={<ShieldCheck className="size-4" />}
                title="个人信息"
                tone={user ? "info" : "neutral"}
                value={user ? "可维护" : "未启用"}
              />
            </div>

            <Card>
              <Card.Header>
                <Card.Description>当前可用功能</Card.Description>
                <Card.Title>基础工作流</Card.Title>
              </Card.Header>
              <Card.Content className="grid gap-3">
                {[
                  "使用邮箱或用户名登录本地账号。",
                  "注册账号时可补充基础个人信息。",
                  "在个人信息页查看并维护队内基础资料。",
                  "在首页确认 API 服务连接状态。",
                ].map((item) => (
                  <div className="flex gap-3 text-sm leading-6" key={item}>
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-accent" />
                    <p>{item}</p>
                  </div>
                ))}
              </Card.Content>
            </Card>
          </div>

          <div className="grid content-start gap-6">
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
                    ? `${health.data.system.platform} ${health.data.system.arch}`
                    : "-",
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
        </div>
      </div>
    </AppShell>
  );
}
