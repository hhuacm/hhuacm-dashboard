"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import { ArrowLeft, UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient, getPreferredUsername } from "@/utils/auth-client";

const getLoginErrorMessage = (message: string | undefined) => {
  if (!message) {
    return "登录失败，请稍后再试。";
  }

  if (message.includes("Invalid email or password")) {
    return "邮箱或密码不正确。";
  }

  if (message.includes("Invalid username or password")) {
    return "用户名或密码不正确。";
  }

  return message;
};

const isEmailIdentifier = (value: string) => value.includes("@");

const getSafeRedirectPath = (redirect: null | string): Route => {
  if (!redirect?.startsWith("/") || redirect.startsWith("//")) {
    return "/profile";
  }

  return redirect as Route;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shellAction = (
    <Button onPress={() => router.push("/")} size="sm" variant="outline">
      <ArrowLeft className="size-4" />
      返回首页
    </Button>
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      setError("请输入邮箱或用户名。");
      return;
    }

    if (!password) {
      setError("请输入密码。");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = isEmailIdentifier(normalizedIdentifier)
        ? await authClient.signIn.email({
            email: normalizedIdentifier.toLowerCase(),
            password,
          })
        : await authClient.signIn.username({
            password,
            username: normalizedIdentifier,
          });

      if (response.error) {
        setError(getLoginErrorMessage(response.error.message));
        return;
      }

      await session.refetch();
      router.push(redirectPath);
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
      <div className="mx-auto grid w-full max-w-xl gap-6 pb-4 sm:pb-8">
        <div className="grid justify-items-center gap-3 text-center">
          <h1 className="text-balance font-semibold text-3xl tracking-normal sm:text-4xl">
            登录 HHUACM Dashboard
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
                你已经登录，可以直接进入个人信息页。
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button onPress={() => router.push(redirectPath)}>
                <UserRound className="size-4" />
                {redirectPath === "/profile" ? "进入个人信息" : "继续"}
              </Button>
            </Card.Footer>
          </Card>
        ) : (
          <Card>
            <Form className="contents" onSubmit={handleSubmit}>
              <Card.Content>
                <div className="flex flex-col gap-4">
                  <TextField
                    fullWidth
                    isDisabled={submitting}
                    name="identifier"
                    onChange={setIdentifier}
                    value={identifier}
                  >
                    <Label>邮箱或用户名</Label>
                    <Input
                      autoComplete="username"
                      placeholder="邮箱或 hhuacmer"
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
                      autoComplete="current-password"
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
                  onPress={() => router.push("/register")}
                  type="button"
                  variant="ghost"
                >
                  还没有账号？
                  <span className="text-accent">注册一个</span>
                </Button>
                <Button isPending={submitting} type="submit">
                  {({ isPending }) => (
                    <>
                      {isPending ? <Spinner color="current" size="sm" /> : null}
                      {isPending ? "处理中" : "登录"}
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
