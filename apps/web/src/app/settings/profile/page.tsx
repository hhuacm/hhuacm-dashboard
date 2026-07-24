"use client";

import { Button, Card, Spinner } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, KeyRound, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { InfoItem } from "@/components/info-item";
import {
  type UserBasicInfoMessage,
  UserBasicInfoSection,
} from "@/components/user-basic-info-section";
import { authClient } from "@/utils/auth-client";
import type { ProfileUpdateValues } from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";
import { OjAccountSection } from "./oj-account-section";
import { PasswordChangeDialog } from "./password-change-dialog";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const queryClient = useQueryClient();
  const [profileMessage, setProfileMessage] =
    useState<null | UserBasicInfoMessage>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const profileQuery = useQuery(
    trpc.settings.profile.get.queryOptions(undefined, {
      enabled: Boolean(user),
      retry: false,
    })
  );
  const updateProfile = useMutation(
    trpc.settings.profile.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.settings.profile.get.queryKey(),
        });
        setProfileMessage({
          text: "资料设置已保存。",
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

  const handlePasswordChanged = async () => {
    await authClient.signOut();
    await session.refetch();
    router.replace("/login?redirect=/settings/profile");
  };

  useEffect(() => {
    if (!(session.isPending || user)) {
      router.replace("/login?redirect=/settings/profile");
    }
  }, [router, session.isPending, user]);

  if (session.isPending) {
    return (
      <AppShell
        description="维护账号资料与 OJ 绑定"
        icon={<UserRound className="size-4" />}
        maxWidth="5xl"
        title="资料设置"
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
        description="维护账号资料与 OJ 绑定"
        icon={<UserRound className="size-4" />}
        maxWidth="5xl"
        title="资料设置"
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
                    完成登录后，这里会显示账号摘要和资料设置表单。
                  </p>
                </div>
              </div>
              <Button
                onPress={() => router.push("/login?redirect=/settings/profile")}
                size="lg"
              >
                前往登录
              </Button>
            </div>
          </Card.Content>
        </Card>
      </AppShell>
    );
  }

  const account = profileQuery.data?.user ?? user;
  const username = account.username;

  return (
    <AppShell
      description="维护账号资料与 OJ 绑定"
      icon={<UserRound className="size-4" />}
      maxWidth="5xl"
      title="资料设置"
    >
      <div className="grid gap-8">
        <Card>
          <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
            <Button
              onPress={() => setIsPasswordDialogOpen(true)}
              variant="secondary"
            >
              <KeyRound className="size-4" />
              修改密码
            </Button>
          </Card.Header>
          <Card.Content>
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="用户名" value={username} />
              <InfoItem label="邮箱" value={account.email} />
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
          profile={profileQuery.data?.profile}
        />

        <OjAccountSection
          accounts={profileQuery.data?.ojAccounts ?? []}
          isError={profileQuery.isError}
          isLoading={profileQuery.isPending}
        />
      </div>
      <PasswordChangeDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        onPasswordChanged={handlePasswordChanged}
      />
    </AppShell>
  );
}
