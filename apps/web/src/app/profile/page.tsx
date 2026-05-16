"use client";

import { Alert, Button, Card, Spinner } from "@heroui/react";
import { UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";

export default function ProfileRedirectPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const username = user?.username ?? null;

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/profile");
      return;
    }

    if (username) {
      router.replace(`/profile/${username}` as Route);
    }
  }, [router, session.isPending, user, username]);

  if (!(session.isPending || username || !user)) {
    return (
      <AppShell
        description="打开公开个人主页"
        icon={<UserRound className="size-4" />}
        maxWidth="4xl"
        title="个人主页"
      >
        <Card>
          <Card.Content className="grid gap-5 py-4">
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>账号缺少用户名</Alert.Title>
                <Alert.Description>
                  无法打开公开个人主页，请重新登录或联系管理员检查账号。
                </Alert.Description>
              </Alert.Content>
            </Alert>
            <Button onPress={() => router.push("/settings/profile" as Route)}>
              <UserRound className="size-4" />
              前往资料设置
            </Button>
          </Card.Content>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      description="打开公开个人主页"
      icon={<UserRound className="size-4" />}
      maxWidth="4xl"
      title="个人主页"
    >
      <div className="flex items-center gap-3">
        <Spinner color="current" size="sm" />
        <p className="font-medium">正在前往个人主页。</p>
      </div>
    </AppShell>
  );
}
