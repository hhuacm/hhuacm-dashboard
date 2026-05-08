"use client";

import { Alert } from "@hhuacm-dashboard/ui/components/alert";
import { Badge } from "@hhuacm-dashboard/ui/components/badge";
import { Button } from "@hhuacm-dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hhuacm-dashboard/ui/components/card";
import { Input } from "@hhuacm-dashboard/ui/components/input";
import { Label } from "@hhuacm-dashboard/ui/components/label";
import { Separator } from "@hhuacm-dashboard/ui/components/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Loader2, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useId, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { FormSection } from "@/components/form-section";
import { InfoItem } from "@/components/info-item";
import { PageHeader } from "@/components/page-header";
import { authClient, getPreferredUsername } from "@/utils/auth-client";
import {
  buildProfileFormValues,
  emptyProfileFormValues,
  getProfileDisplayValue,
  type ProfileFieldKey,
  type ProfileFormValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";

interface ProfileMessage {
  text: string;
  tone: "destructive" | "success";
}

export default function ProfilePage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const realNameId = useId();
  const gradeId = useId();
  const studentIdId = useId();
  const majorId = useId();
  const [formValues, setFormValues] = useState<ProfileFormValues>(
    emptyProfileFormValues
  );
  const [profileMessage, setProfileMessage] = useState<null | ProfileMessage>(
    null
  );
  const profileQuery = useQuery(
    trpc.profile.get.queryOptions(undefined, {
      enabled: Boolean(userId),
    })
  );
  const updateProfile = useMutation(
    trpc.profile.update.mutationOptions({
      onError: () => {
        setProfileMessage({
          text: "保存失败，请稍后再试。",
          tone: "destructive",
        });
      },
      onSuccess: (profile) => {
        queryClient.setQueryData(trpc.profile.get.queryKey(), profile);
        setFormValues(buildProfileFormValues(profile));
        setProfileMessage({
          text: "个人信息已保存。",
          tone: "success",
        });
      },
    })
  );
  const fieldIds: Record<ProfileFieldKey, string> = {
    grade: gradeId,
    major: majorId,
    realName: realNameId,
    studentId: studentIdId,
  };

  useEffect(() => {
    if (!userId) {
      setFormValues(emptyProfileFormValues);
      return;
    }

    if (profileQuery.data) {
      setFormValues(buildProfileFormValues(profileQuery.data));
    }
  }, [profileQuery.data, userId]);

  const handleProfileInputChange = (field: ProfileFieldKey, value: string) => {
    setProfileMessage(null);
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    updateProfile.mutate(formValues);
  };

  const shellAction = (
    <Button
      nativeButton={false}
      render={<Link href="/" />}
      size="sm"
      variant="outline"
    >
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
          <CardContent>
            <EmptyState
              description="请稍候，正在从认证服务读取当前会话。"
              icon={<Loader2 className="size-5 animate-spin" />}
              title="正在确认登录状态"
            />
          </CardContent>
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
          <CardContent>
            <EmptyState
              action={
                <Button
                  nativeButton={false}
                  render={<Link href="/" />}
                  size="lg"
                >
                  返回首页登录
                </Button>
              }
              description="回到首页完成登录后，这里会显示账号摘要和个人信息表单。"
              icon={<UserRound className="size-5" />}
              title="尚未登录"
            />
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const username = getPreferredUsername(user);

  return (
    <AppShell
      action={shellAction}
      description="查看和维护队内基础资料"
      icon={<UserRound className="size-4" />}
      maxWidth="5xl"
      title="个人信息"
    >
      <div className="grid gap-8">
        <PageHeader
          action={<Badge variant="success">已登录</Badge>}
          description="这里展示账号摘要和队内基础信息。更新后会同步保存到当前账号。"
          title="个人信息"
        />

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-lg border bg-muted text-primary">
                <BadgeCheck className="size-5" />
              </div>
              <div>
                <CardDescription>当前账号</CardDescription>
                <CardTitle className="mt-1 break-all text-2xl">
                  {username}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-3">
              <InfoItem label="用户名" value={username} />
              <InfoItem label="邮箱" value={user.email} />
              <InfoItem label="用户 ID" mono value={user.id} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>资料状态</CardDescription>
            <CardTitle>队内基础信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {profileQuery.isPending ? (
              <Alert variant="info">正在读取个人信息。</Alert>
            ) : null}
            {profileQuery.isError ? (
              <Alert variant="destructive">
                个人信息加载失败，请刷新页面重试。
              </Alert>
            ) : null}

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {profileFieldConfigs.map((field) => (
                <InfoItem
                  key={field.key}
                  label={field.label}
                  value={getProfileDisplayValue(profileQuery.data?.[field.key])}
                />
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <FormSection
              description="这些信息用于队内统计和后续业务模块识别。"
              title="编辑资料"
            >
              <form className="grid gap-5" onSubmit={handleProfileSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {profileFieldConfigs.map((field) => (
                    <div className="grid gap-2" key={field.key}>
                      <Label htmlFor={fieldIds[field.key]}>{field.label}</Label>
                      <Input
                        autoComplete={field.autoComplete}
                        disabled={
                          profileQuery.isPending || updateProfile.isPending
                        }
                        id={fieldIds[field.key]}
                        name={field.key}
                        onChange={(event) =>
                          handleProfileInputChange(
                            field.key,
                            event.target.value
                          )
                        }
                        placeholder="未填写"
                        value={formValues[field.key]}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    disabled={profileQuery.isPending || updateProfile.isPending}
                    type="submit"
                  >
                    <Save className="size-4" />
                    {updateProfile.isPending ? "保存中" : "保存"}
                  </Button>

                  {profileMessage ? (
                    <Alert
                      aria-live="polite"
                      className="sm:max-w-sm"
                      role="status"
                      variant={profileMessage.tone}
                    >
                      {profileMessage.text}
                    </Alert>
                  ) : null}
                </div>
              </form>
            </FormSection>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
