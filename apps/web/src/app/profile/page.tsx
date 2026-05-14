"use client";

import { Button, Card, Spinner } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  type UserBasicInfoMessage,
  UserBasicInfoSection,
} from "@/components/user-basic-info-section";
import { authClient, getPreferredUsername } from "@/utils/auth-client";
import type { ProfileUpdateValues } from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";
import { OjAccountSection } from "./oj-account-section";

export default function ProfilePage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [profileMessage, setProfileMessage] =
    useState<null | UserBasicInfoMessage>(null);
  const profileQuery = useQuery(
    trpc.profile.get.queryOptions(undefined, {
      enabled: Boolean(userId),
    })
  );
  const updateProfile = useMutation(
    trpc.profile.update.mutationOptions({
      onSuccess: (profile) => {
        queryClient.setQueryData(trpc.profile.get.queryKey(), profile);
        setProfileMessage({
          text: "个人信息已保存。",
          tone: "success",
        });
      },
    })
  );

  const handleProfileSubmit = async (values: ProfileUpdateValues) => {
    setProfileMessage(null);

    try {
      await updateProfile.mutateAsync(values);
    } catch {
      throw new Error("保存失败，请稍后再试。");
    }
  };

  const shellAction = (
    <Button onPress={() => router.push("/")} size="sm" variant="outline">
      <ArrowLeft className="size-4" />
      返回首页
    </Button>
  );

  if (session.isPending) {
    return (
      <AppShell
        action={shellAction}
        description="查看和维护队内基础资料"
        icon={<UserRound className="size-4" />}
        maxWidth="5xl"
        title="个人信息"
      >
        <Card>
          <Card.Content>
            <div className="grid gap-5 py-4">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-default text-accent">
                  <Spinner color="current" size="sm" />
                </div>
                <div>
                  <h2 className="font-semibold text-xl">正在确认登录状态</h2>
                  <p className="mt-2 text-muted text-sm leading-6">
                    请稍候，正在从认证服务读取当前会话。
                  </p>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell
        action={shellAction}
        description="查看和维护队内基础资料"
        icon={<UserRound className="size-4" />}
        maxWidth="5xl"
        title="个人信息"
      >
        <Card>
          <Card.Content>
            <div className="grid gap-5 py-4">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-default text-accent">
                  <UserRound className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-xl">尚未登录</h2>
                  <p className="mt-2 text-muted text-sm leading-6">
                    完成登录后，这里会显示账号摘要和个人信息表单。
                  </p>
                </div>
              </div>
              <Button onPress={() => router.push("/login")} size="lg">
                前往登录
              </Button>
            </div>
          </Card.Content>
        </Card>
      </AppShell>
    );
  }

  const username = getPreferredUsername(user);
  const authUsername = user.username ?? null;

  return (
    <AppShell
      action={shellAction}
      description="查看和维护队内基础资料"
      icon={<UserRound className="size-4" />}
      maxWidth="5xl"
      title="个人信息"
    >
      <div className="grid gap-8">
        <Card>
          <Card.Header>
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-default text-accent">
                <BadgeCheck className="size-5" />
              </div>
              <div>
                <Card.Description>当前账号</Card.Description>
                <Card.Title className="mt-1 break-all text-2xl">
                  {username}
                </Card.Title>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface p-4">
                <dt className="text-muted text-sm">用户名</dt>
                <dd className="mt-2 break-all font-medium text-base text-foreground">
                  {username}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <dt className="text-muted text-sm">邮箱</dt>
                <dd className="mt-2 break-all font-medium text-base text-foreground">
                  {user.email}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-surface p-4">
                <dt className="text-muted text-sm">用户 ID</dt>
                <dd className="mt-2 break-all font-medium font-mono text-foreground text-sm">
                  {user.id}
                </dd>
              </div>
            </dl>
          </Card.Content>
        </Card>

        <UserBasicInfoSection
          isError={profileQuery.isError}
          isLoading={profileQuery.isPending}
          isSaving={updateProfile.isPending}
          message={profileMessage}
          onClearMessage={() => setProfileMessage(null)}
          onSubmit={handleProfileSubmit}
          profile={profileQuery.data}
        />

        <OjAccountSection username={authUsername} />
      </div>
    </AppShell>
  );
}
