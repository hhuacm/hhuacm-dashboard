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
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { PasswordField } from "@/components/password-field";
import { authClient, getUsernameLabel } from "@/utils/auth-client";

interface LoginFormValues {
  identifier: string;
  password: string;
}

const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, "请输入邮箱或用户名。"),
  password: z.string().min(1, "请输入密码。"),
}) satisfies z.ZodType<LoginFormValues>;

const emptyLoginFormValues: LoginFormValues = {
  identifier: "",
  password: "",
};

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

const getUserProfilePath = (username: null | string | undefined): Route =>
  username ? (`/profile/${username}` as Route) : "/profile";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<LoginFormValues>({
    defaultValues: emptyLoginFormValues,
    resolver: zodResolver(loginFormSchema),
  });
  const { control, handleSubmit: handleFormSubmit } = form;

  const handleSubmit = handleFormSubmit(
    async (values) => {
      const normalizedIdentifier = values.identifier;
      setError("");
      setSubmitting(true);

      try {
        const response = isEmailIdentifier(normalizedIdentifier)
          ? await authClient.signIn.email({
              email: normalizedIdentifier.toLowerCase(),
              password: values.password,
            })
          : await authClient.signIn.username({
              password: values.password,
              username: normalizedIdentifier,
            });

        if (response.error) {
          setError(getLoginErrorMessage(response.error.message));
          return;
        }

        const signedInUsername =
          response.data?.user.username ??
          (isEmailIdentifier(normalizedIdentifier)
            ? user?.username
            : normalizedIdentifier);

        router.push(
          redirectPath === "/profile"
            ? getUserProfilePath(signedInUsername)
            : redirectPath
        );
        await session.refetch();
      } catch {
        setError("认证服务暂时不可用，请确认后端和数据库已启动。");
      } finally {
        setSubmitting(false);
      }
    },
    (errors) => {
      setError(
        errors.identifier?.message ??
          errors.password?.message ??
          "请检查登录信息。"
      );
    }
  );

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
                {getUsernameLabel(user)}
              </Card.Title>
              <Card.Description>
                你已经登录，可以直接进入个人主页。
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button
                onPress={() =>
                  router.push(
                    redirectPath === "/profile"
                      ? getUserProfilePath(user.username)
                      : redirectPath
                  )
                }
              >
                <UserRound className="size-4" />
                {redirectPath === "/profile" ? "进入个人主页" : "继续"}
              </Button>
            </Card.Footer>
          </Card>
        ) : (
          <Card>
            <Form className="contents" onSubmit={handleSubmit}>
              <Card.Content>
                <div className="flex flex-col gap-4">
                  <Controller
                    control={control}
                    name="identifier"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        isDisabled={submitting}
                        name={field.name}
                        onChange={field.onChange}
                        value={field.value}
                      >
                        <Label>邮箱或用户名</Label>
                        <Input
                          autoComplete="username"
                          placeholder="邮箱或 hhuacmer"
                          variant="secondary"
                        />
                      </TextField>
                    )}
                  />

                  <Controller
                    control={control}
                    name="password"
                    render={({ field }) => (
                      <PasswordField
                        autoComplete="current-password"
                        isDisabled={submitting}
                        label="密码"
                        name={field.name}
                        onChange={field.onChange}
                        placeholder="输入密码"
                        value={field.value}
                      />
                    )}
                  />

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
