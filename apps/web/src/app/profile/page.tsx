"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Form,
  Input,
  Label,
  Separator,
  Spinner,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
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
  tone: "danger" | "success";
}

export default function ProfilePage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
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
          tone: "danger",
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
            <EmptyState
              description="请稍候，正在从认证服务读取当前会话。"
              icon={<Spinner color="current" size="sm" />}
              title="正在确认登录状态"
            />
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
            <EmptyState
              action={
                <Button onPress={() => router.push("/login")} size="lg">
                  前往登录
                </Button>
              }
              description="完成登录后，这里会显示账号摘要和个人信息表单。"
              icon={<UserRound className="size-5" />}
              title="尚未登录"
            />
          </Card.Content>
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
          action={
            <Chip color="success" size="sm" variant="soft">
              已登录
            </Chip>
          }
          description="这里展示账号摘要和队内基础信息。更新后会同步保存到当前账号。"
          title="个人信息"
        />

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
              <InfoItem label="用户名" value={username} />
              <InfoItem label="邮箱" value={user.email} />
              <InfoItem label="用户 ID" mono value={user.id} />
            </dl>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Description>资料状态</Card.Description>
            <Card.Title>队内基础信息</Card.Title>
          </Card.Header>
          <Card.Content className="grid gap-4">
            {profileQuery.isPending ? (
              <Alert>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>正在读取个人信息。</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
            {profileQuery.isError ? (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    个人信息加载失败，请刷新页面重试。
                  </Alert.Description>
                </Alert.Content>
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
          </Card.Content>
        </Card>

        <Card>
          <Card.Content>
            <FormSection
              description="这些信息用于队内统计和后续业务模块识别。"
              title="编辑资料"
            >
              <Form className="grid gap-5" onSubmit={handleProfileSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {profileFieldConfigs.map((field) => (
                    <TextField
                      fullWidth
                      isDisabled={
                        profileQuery.isPending || updateProfile.isPending
                      }
                      key={field.key}
                      name={field.key}
                      onChange={(value) =>
                        handleProfileInputChange(field.key, value)
                      }
                      value={formValues[field.key]}
                    >
                      <Label>{field.label}</Label>
                      <Input
                        autoComplete={field.autoComplete}
                        placeholder="未填写"
                        variant="secondary"
                      />
                    </TextField>
                  ))}
                </div>

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    isDisabled={profileQuery.isPending}
                    isPending={updateProfile.isPending}
                    type="submit"
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        {isPending ? "保存中" : "保存"}
                      </>
                    )}
                  </Button>

                  {profileMessage ? (
                    <Alert className="sm:max-w-sm" status={profileMessage.tone}>
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>
                          {profileMessage.text}
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}
                </div>
              </Form>
            </FormSection>
          </Card.Content>
        </Card>
      </div>
    </AppShell>
  );
}
