"use client";

import { Button, Card, Chip } from "@heroui/react";
import { ArrowLeft, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient, getPreferredUsername } from "@/utils/auth-client";

import { AppShell } from "./app-shell";
import { type AuthMode, AuthPanel } from "./auth-panel";
import { PageHeader } from "./page-header";

interface AuthPageProps {
  mode: AuthMode;
}

const authPageCopy = {
  login: {
    description: "登录后可以维护个人信息，并进入后续队务模块。",
    title: "登录 HHUACM Dashboard",
  },
  register: {
    description: "创建账号后可以补充队内基础资料，用于后续统计和业务模块识别。",
    title: "注册 HHUACM Dashboard",
  },
} as const;

const getAuthPath = (mode: AuthMode) =>
  mode === "login" ? "/login" : "/register";

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const copy = authPageCopy[mode];

  const handleSuccess = async () => {
    await session.refetch();
    router.push("/profile");
  };

  const handleModeChange = (nextMode: AuthMode) => {
    router.push(getAuthPath(nextMode));
  };

  const shellAction = (
    <Button onPress={() => router.push("/")} size="sm" variant="outline">
      <ArrowLeft className="size-4" />
      返回首页
    </Button>
  );

  return (
    <AppShell
      action={shellAction}
      description="账号与个人资料入口"
      icon={<UserRound className="size-4" />}
      maxWidth="4xl"
      title="账号"
    >
      <div className="mx-auto grid w-full max-w-xl gap-6 py-4 sm:py-8">
        <PageHeader
          action={
            user ? (
              <Chip color="success" size="sm" variant="soft">
                已登录
              </Chip>
            ) : null
          }
          description={copy.description}
          title={copy.title}
        />

        {user ? (
          <Card>
            <Card.Header>
              <Card.Description>当前账号</Card.Description>
              <Card.Title className="break-all">
                {getPreferredUsername(user)}
              </Card.Title>
              <Card.Description>
                你已经登录，可以直接进入个人信息页。
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button onPress={() => router.push("/profile")}>
                <UserRound className="size-4" />
                进入个人信息
              </Button>
            </Card.Footer>
          </Card>
        ) : (
          <AuthPanel
            mode={mode}
            onModeChange={handleModeChange}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </AppShell>
  );
}
