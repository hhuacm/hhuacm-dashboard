"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Fieldset,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  Separator,
  Spinner,
  TextField,
} from "@heroui/react";
import { getGradeOptions } from "@hhuacm-dashboard/domain";
import { useMutation } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type FormEvent, type Key, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient, getPreferredUsername } from "@/utils/auth-client";
import {
  emptyProfileFormValues,
  getChangedProfileValues,
  hasProfileUpdateValues,
  type ProfileFieldKey,
  type ProfileFormValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";

const getRegisterErrorMessage = (message: string | undefined) => {
  if (!message) {
    return "注册失败，请稍后再试。";
  }

  if (message.includes("Username is already taken")) {
    return "这个用户名已经被使用。";
  }

  if (message.includes("already exists") || message.includes("already taken")) {
    return "这个邮箱或用户名已经被使用。";
  }

  if (message.includes("too short")) {
    return "用户名至少需要 3 个字符，密码至少需要 8 个字符。";
  }

  if (message.includes("too long")) {
    return "用户名最多 30 个字符。";
  }

  if (message.includes("invalid")) {
    return "用户名只能包含字母、数字、下划线或点。";
  }

  return message;
};

interface RegisterProfileFieldInputProps {
  field: (typeof profileFieldConfigs)[number];
  gradeOptions: string[];
  isDisabled?: boolean;
  onChange: (field: ProfileFieldKey, value: string) => void;
  value: string;
}

function RegisterProfileFieldInput({
  field,
  gradeOptions,
  isDisabled = false,
  onChange,
  value,
}: RegisterProfileFieldInputProps) {
  if (field.key === "grade") {
    const handleGradeChange = (key: Key | null) => {
      onChange(field.key, typeof key === "string" ? key : "");
    };

    return (
      <Select
        fullWidth
        isDisabled={isDisabled}
        onSelectionChange={handleGradeChange}
        placeholder="可不填"
        selectedKey={value || null}
        variant="secondary"
      >
        <Label>{field.label}</Label>
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
      key={field.key}
      name={field.key}
      onChange={(value) => onChange(field.key, value)}
      value={value}
    >
      <Label>{field.label}</Label>
      <Input
        autoComplete={field.autoComplete}
        placeholder="可不填"
        variant="secondary"
      />
    </TextField>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileFormValues, setProfileFormValues] = useState<ProfileFormValues>(
    emptyProfileFormValues
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const gradeOptions = getGradeOptions();
  const updateProfile = useMutation(
    trpc.settings.profile.update.mutationOptions()
  );

  const handleProfileInputChange = (field: ProfileFieldKey, value: string) => {
    setProfileFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedUsername) {
      setError("请输入用户名。");
      return;
    }

    if (!normalizedEmail) {
      setError("请输入邮箱。");
      return;
    }

    if (!password) {
      setError("请输入密码。");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await authClient.signUp.email({
        displayUsername: normalizedUsername,
        email: normalizedEmail,
        name: normalizedUsername,
        password,
        username: normalizedUsername,
      });

      if (response.error) {
        setError(getRegisterErrorMessage(response.error.message));
        return;
      }

      const changedProfileValues = getChangedProfileValues(
        profileFormValues,
        emptyProfileFormValues
      );

      if (hasProfileUpdateValues(changedProfileValues)) {
        try {
          await updateProfile.mutateAsync(changedProfileValues);
        } catch {
          setError("账号已创建，但个人信息保存失败，可稍后在资料设置页补填。");
          await session.refetch();
          return;
        }
      }

      await session.refetch();
      router.push(`/profile/${normalizedUsername}` as Route);
    } catch {
      setError("认证服务暂时不可用，请确认后端和数据库已启动。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      description="账号与个人资料入口"
      icon={<UserRound className="size-4" />}
      maxWidth="4xl"
      title="账号"
    >
      <div className="mx-auto grid w-full max-w-xl gap-6 pb-4 sm:pb-8">
        <div className="grid justify-items-center gap-3 text-center">
          <h1 className="text-balance font-semibold text-3xl tracking-normal sm:text-4xl">
            注册 HHUACM Dashboard
          </h1>
          {user ? (
            <Chip color="success" size="sm" variant="soft">
              已登录
            </Chip>
          ) : null}
        </div>

        {user ? (
          <Card>
            <Card.Header>
              <Card.Description>当前账号</Card.Description>
              <Card.Title className="break-all">
                {getPreferredUsername(user)}
              </Card.Title>
              <Card.Description>
                你已经登录，可以直接进入个人主页。
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button onPress={() => router.push("/profile")}>
                <UserRound className="size-4" />
                进入个人主页
              </Button>
            </Card.Footer>
          </Card>
        ) : (
          <Card>
            <Card.Header>
              <Card.Title className="text-xl">创建账号</Card.Title>
            </Card.Header>

            <Form className="contents" onSubmit={handleSubmit}>
              <Card.Content>
                <div className="flex flex-col gap-4">
                  <TextField
                    fullWidth
                    isDisabled={submitting}
                    name="username"
                    onChange={setUsername}
                    value={username}
                  >
                    <Label>用户名</Label>
                    <Input
                      autoComplete="username"
                      placeholder="例如 hhuacmer"
                      variant="secondary"
                    />
                  </TextField>

                  <TextField
                    fullWidth
                    isDisabled={submitting}
                    name="email"
                    onChange={setEmail}
                    type="email"
                    value={email}
                  >
                    <Label>邮箱</Label>
                    <Input
                      autoComplete="email"
                      placeholder="name@example.com"
                      variant="secondary"
                    />
                  </TextField>

                  <TextField
                    fullWidth
                    isDisabled={submitting}
                    name="password"
                    onChange={setPassword}
                    type="password"
                    value={password}
                  >
                    <Label>密码</Label>
                    <Input
                      autoComplete="new-password"
                      placeholder="输入密码"
                      variant="secondary"
                    />
                  </TextField>

                  <Separator />

                  <Fieldset className="rounded-xl border border-border bg-surface-secondary p-4">
                    <Fieldset.Legend className="px-1">
                      个人信息（可选）
                    </Fieldset.Legend>
                    <Fieldset.Group className="grid gap-4 sm:grid-cols-2">
                      {profileFieldConfigs.map((field) => (
                        <RegisterProfileFieldInput
                          field={field}
                          gradeOptions={gradeOptions}
                          isDisabled={submitting}
                          key={field.key}
                          onChange={handleProfileInputChange}
                          value={profileFormValues[field.key]}
                        />
                      ))}
                    </Fieldset.Group>
                  </Fieldset>

                  {error ? (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{error}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}
                </div>
              </Card.Content>

              <Card.Footer className="mt-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  isDisabled={submitting}
                  onPress={() => router.push("/login")}
                  type="button"
                  variant="ghost"
                >
                  已经有账号？
                  <span className="text-accent">去登录</span>
                </Button>
                <Button isPending={submitting} type="submit">
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? "处理中" : "注册"}
                    </>
                  )}
                </Button>
              </Card.Footer>
            </Form>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
