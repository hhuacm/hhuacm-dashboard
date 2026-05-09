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
  Separator,
  Spinner,
  TextField,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { authClient, getPreferredUsername } from "@/utils/auth-client";
import {
  emptyProfileFormValues,
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

export default function RegisterPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileFormValues, setProfileFormValues] = useState<ProfileFormValues>(
    emptyProfileFormValues
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const updateProfile = useMutation(
    trpc.profile.update.mutationOptions({
      onSuccess: (profile) => {
        queryClient.setQueryData(trpc.profile.get.queryKey(), profile);
      },
    })
  );

  const shellAction = (
    <Button onPress={() => router.push("/")} size="sm" variant="outline">
      <ArrowLeft className="size-4" />
      返回首页
    </Button>
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

      try {
        await updateProfile.mutateAsync(profileFormValues);
      } catch {
        setError("账号已创建，但个人信息保存失败，可稍后在个人信息页补填。");
        await session.refetch();
        return;
      }

      await session.refetch();
      router.push("/profile");
    } catch {
      setError("认证服务暂时不可用，请确认后端和数据库已启动。");
    } finally {
      setSubmitting(false);
    }
  };

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
          description="创建账号后可以补充队内基础资料，用于后续统计和业务模块识别。"
          title="注册 HHUACM Dashboard"
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
          <Card>
            <Card.Header>
              <Card.Description>账号入口</Card.Description>
              <Card.Title className="text-xl">创建账号</Card.Title>
              <Card.Description>
                使用用户名、邮箱和密码创建本地开发账号。
              </Card.Description>
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

                  <Fieldset className="rounded-xl border border-border bg-surface-secondary p-4">
                    <Fieldset.Legend className="px-1">
                      个人信息（可选）
                    </Fieldset.Legend>
                    <Fieldset.Group className="grid gap-4 sm:grid-cols-2">
                      {profileFieldConfigs.map((field) => (
                        <TextField
                          fullWidth
                          isDisabled={submitting}
                          key={field.key}
                          name={field.key}
                          onChange={(value) =>
                            handleProfileInputChange(field.key, value)
                          }
                          value={profileFormValues[field.key]}
                        >
                          <Label>{field.label}</Label>
                          <Input
                            autoComplete={field.autoComplete}
                            placeholder="可不填"
                            variant="secondary"
                          />
                        </TextField>
                      ))}
                    </Fieldset.Group>
                  </Fieldset>

                  <Separator />

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
