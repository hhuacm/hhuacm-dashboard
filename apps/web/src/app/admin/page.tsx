"use client";

import { Alert, Button, Card, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  LayoutDashboard,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

const redirectDelayMs = 3000;

export default function AdminPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
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

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      const timeoutId = window.setTimeout(() => {
        router.push("/login?redirect=/admin");
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

  return (
    <AppShell
      description="管理员控制台"
      icon={<LayoutDashboard className="size-4" />}
      maxWidth="4xl"
      title="管理面板"
    >
      <div className="grid gap-4">
        {isCheckingAccess ? (
          <div className="flex items-center gap-3">
            <Spinner color="current" size="sm" />
            <p className="font-medium">正在确认管理员权限。</p>
          </div>
        ) : null}

        {shouldPromptLogin ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>请登录管理员账户</Alert.Title>
              <Alert.Description>
                即将跳转到登录页面，登录后会回到管理面板。
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {isMember ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>不具备管理员权限</Alert.Title>
              <Alert.Description>即将跳转到首页。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {isAdmin ? (
          <Card>
            <Card.Header>
              <div>
                <Card.Title className="mt-1">管理面板</Card.Title>
              </div>
            </Card.Header>
            <Card.Content className="grid gap-4">
              <Button
                className="justify-start"
                onPress={() => router.push("/admin/users" as Route)}
                size="lg"
                variant="outline"
              >
                <UsersRound className="size-4" />
                用户列表
              </Button>
              <Button
                className="justify-start"
                onPress={() =>
                  router.push("/admin/problem-sets/import" as Route)
                }
                size="lg"
                variant="outline"
              >
                <Plus className="size-4" />
                导入题单
              </Button>
              <Button
                className="justify-start"
                onPress={() => router.push("/admin/export" as Route)}
                size="lg"
                variant="outline"
              >
                <Download className="size-4" />
                系统导出
              </Button>
              <Button
                className="justify-start"
                onPress={() => router.push("/admin/settings" as Route)}
                size="lg"
                variant="outline"
              >
                <Settings className="size-4" />
                全局设置
              </Button>
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
