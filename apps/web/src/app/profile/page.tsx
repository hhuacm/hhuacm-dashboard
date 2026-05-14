"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  Separator,
  Spinner,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Save, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type Key,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { AppShell } from "@/components/app-shell";
import { authClient, getPreferredUsername } from "@/utils/auth-client";
import {
  buildProfileFormValues,
  emptyProfileFormValues,
  getChangedProfileValues,
  getGradeOptionsWithCurrentValue,
  getProfileDisplayValue,
  hasProfileUpdateValues,
  type ProfileFieldKey,
  type ProfileFormValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";
import { OjAccountSection } from "./oj-account-section";

interface ProfileMessage {
  text: string;
  tone: "danger" | "success";
}

const memberStatusConfig = {
  active: {
    className: "bg-success-soft text-success",
    label: "服役中",
  },
  frozen: {
    className: "bg-black text-white",
    label: "已冻结",
  },
  retired: {
    className: "bg-default text-muted",
    label: "已退役",
  },
  selection: {
    className: "bg-accent-soft text-accent",
    label: "选拔中",
  },
} as const;

type MemberStatus = keyof typeof memberStatusConfig;

const isMemberStatus = (
  status: null | string | undefined
): status is MemberStatus => Boolean(status && status in memberStatusConfig);

interface ProfileInfoItemProps {
  label: string;
  mono?: boolean;
  value: ReactNode;
}

interface ProfileFieldInputProps {
  field: (typeof profileFieldConfigs)[number];
  gradeOptions: string[];
  isChanged?: boolean;
  isDisabled?: boolean;
  onChange: (field: ProfileFieldKey, value: string) => void;
  placeholder: string;
  value: string;
}

function ProfileInfoItem({ label, mono = false, value }: ProfileInfoItemProps) {
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

function MemberStatusBadge({ status }: { status: null | string | undefined }) {
  const config = isMemberStatus(status)
    ? memberStatusConfig[status]
    : memberStatusConfig.selection;

  return (
    <Chip className={config.className} size="md" variant="soft">
      {config.label}
    </Chip>
  );
}

function ProfileFieldLabel({
  isChanged = false,
  label,
}: {
  isChanged?: boolean;
  label: string;
}) {
  return (
    <Label
      className={
        isChanged
          ? "inline-flex items-center gap-2 font-semibold text-accent"
          : "font-medium text-foreground"
      }
    >
      {label}
      {isChanged ? (
        <Chip color="accent" size="sm" variant="soft">
          已修改
        </Chip>
      ) : null}
    </Label>
  );
}

function ProfileFieldInput({
  field,
  gradeOptions,
  isChanged = false,
  isDisabled = false,
  onChange,
  placeholder,
  value,
}: ProfileFieldInputProps) {
  if (field.key === "grade") {
    const handleGradeChange = (key: Key | null) => {
      onChange(field.key, typeof key === "string" ? key : "");
    };

    return (
      <Select
        fullWidth
        isDisabled={isDisabled}
        onSelectionChange={handleGradeChange}
        placeholder={placeholder}
        selectedKey={value || null}
        variant="secondary"
      >
        <ProfileFieldLabel isChanged={isChanged} label={field.label} />
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="" textValue="未填写">
              未填写
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {gradeOptions.map((option) => (
              <ListBox.Item id={option} key={option} textValue={option}>
                {option}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    );
  }

  return (
    <TextField
      fullWidth
      isDisabled={isDisabled}
      name={field.key}
      onChange={(nextValue) => onChange(field.key, nextValue)}
      value={value}
    >
      <ProfileFieldLabel isChanged={isChanged} label={field.label} />
      <Input
        autoComplete={field.autoComplete}
        placeholder={placeholder}
        variant="secondary"
      />
    </TextField>
  );
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
  const [originalFormValues, setOriginalFormValues] =
    useState<ProfileFormValues>(emptyProfileFormValues);
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
        const nextFormValues = buildProfileFormValues(profile);
        setFormValues(nextFormValues);
        setOriginalFormValues(nextFormValues);
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
      setOriginalFormValues(emptyProfileFormValues);
      return;
    }

    if (profileQuery.data) {
      const nextFormValues = buildProfileFormValues(profileQuery.data);
      setFormValues(nextFormValues);
      setOriginalFormValues(nextFormValues);
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

    const changedValues = getChangedProfileValues(
      formValues,
      originalFormValues
    );

    if (!hasProfileUpdateValues(changedValues)) {
      setProfileMessage({
        text: "没有需要保存的修改。",
        tone: "success",
      });
      return;
    }

    updateProfile.mutate(changedValues);
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
  const changedProfileValues = getChangedProfileValues(
    formValues,
    originalFormValues
  );
  const hasProfileChanges = hasProfileUpdateValues(changedProfileValues);
  const gradeOptions = getGradeOptionsWithCurrentValue(
    originalFormValues.grade
  );

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
              <ProfileInfoItem label="用户名" value={username} />
              <ProfileInfoItem label="邮箱" value={user.email} />
              <ProfileInfoItem label="用户 ID" mono value={user.id} />
            </dl>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <h2 className="font-semibold text-xl">队内基础信息</h2>
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

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <ProfileInfoItem
                label="状态"
                value={
                  <MemberStatusBadge status={profileQuery.data?.memberStatus} />
                }
              />
              {profileFieldConfigs.map((field) => (
                <ProfileInfoItem
                  key={field.key}
                  label={field.label}
                  value={getProfileDisplayValue(profileQuery.data?.[field.key])}
                />
              ))}
            </dl>
          </Card.Content>
        </Card>

        <OjAccountSection username={authUsername} />

        <Card>
          <Card.Content>
            <section className="grid gap-5">
              <h2 className="font-semibold text-xl">编辑资料</h2>

              <Form className="grid gap-5" onSubmit={handleProfileSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {profileFieldConfigs.map((field) => (
                    <ProfileFieldInput
                      field={field}
                      gradeOptions={gradeOptions}
                      isChanged={field.key in changedProfileValues}
                      isDisabled={
                        profileQuery.isPending || updateProfile.isPending
                      }
                      key={field.key}
                      onChange={handleProfileInputChange}
                      placeholder="未填写"
                      value={formValues[field.key]}
                    />
                  ))}
                </div>

                <Separator />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    isDisabled={profileQuery.isPending || !hasProfileChanges}
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
            </section>
          </Card.Content>
        </Card>
      </div>
    </AppShell>
  );
}
