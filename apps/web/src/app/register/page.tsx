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
import { isValidGradeOption } from "@hhuacm-dashboard/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { PasswordField } from "@/components/password-field";
import { ProfileFieldInput } from "@/components/profile-field-input";
import { authClient, getUsernameLabel } from "@/utils/auth-client";
import {
  emptyProfileFormValues,
  type ProfileFormValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";

type RegisterFormValues = ProfileFormValues & {
  email: string;
  password: string;
  username: string;
};

const emptyRegisterFormValues: RegisterFormValues = {
  ...emptyProfileFormValues,
  email: "",
  password: "",
  username: "",
};

const registerFormSchema = z.object({
  email: z.string().trim().min(1, "请输入邮箱。"),
  grade: z.string().refine(isValidGradeOption, "请选择年级。"),
  major: z.string().trim().min(1, "请输入专业。"),
  password: z.string().min(1, "请输入密码。"),
  realName: z.string().trim().min(1, "请输入姓名。"),
  studentId: z.string().trim().min(1, "请输入学号。"),
  username: z.string().trim().min(1, "请输入用户名。"),
}) satisfies z.ZodType<RegisterFormValues>;

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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<RegisterFormValues>({
    defaultValues: emptyRegisterFormValues,
    resolver: zodResolver(registerFormSchema),
  });
  const { control, handleSubmit: handleFormSubmit } = form;
  const handleSubmit = handleFormSubmit(
    async (values) => {
      const username = values.username;
      const email = values.email.toLowerCase();
      setError("");
      setSubmitting(true);

      try {
        const response = await authClient.signUp.email({
          email,
          grade: values.grade,
          major: values.major,
          name: values.realName,
          password: values.password,
          studentId: values.studentId,
          username,
        });

        if (response.error) {
          setError(getRegisterErrorMessage(response.error.message));
          setSubmitting(false);
          return;
        }

        await session.refetch();
        router.push(`/profile/${username}` as Route);
        setSubmitting(false);
      } catch {
        setError("认证服务暂时不可用，请稍后重试。");
        setSubmitting(false);
      }
    },
    (errors) => {
      setError(
        errors.username?.message ??
          errors.email?.message ??
          errors.password?.message ??
          errors.realName?.message ??
          errors.grade?.message ??
          errors.studentId?.message ??
          errors.major?.message ??
          "请检查注册信息。"
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
                {getUsernameLabel(user)}
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
                  <Controller
                    control={control}
                    name="username"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        isDisabled={submitting}
                        name={field.name}
                        onChange={field.onChange}
                        value={field.value}
                      >
                        <Label>用户名</Label>
                        <Input
                          autoComplete="username"
                          placeholder="例如 hhuacmer"
                          variant="secondary"
                        />
                      </TextField>
                    )}
                  />

                  <Controller
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <TextField
                        fullWidth
                        isDisabled={submitting}
                        name={field.name}
                        onChange={field.onChange}
                        type="email"
                        value={field.value}
                      >
                        <Label>邮箱</Label>
                        <Input
                          autoComplete="email"
                          placeholder="name@example.com"
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
                        autoComplete="new-password"
                        isDisabled={submitting}
                        label="密码"
                        name={field.name}
                        onChange={field.onChange}
                        placeholder="输入密码"
                        value={field.value}
                      />
                    )}
                  />

                  <Separator />

                  <Fieldset className="rounded-xl border border-border bg-surface-secondary p-4">
                    <Fieldset.Legend className="px-1">个人信息</Fieldset.Legend>
                    <Fieldset.Group className="grid gap-4 sm:grid-cols-2">
                      {profileFieldConfigs.map((field) => (
                        <Controller
                          control={control}
                          key={field.key}
                          name={field.key}
                          render={({ field: profileField }) => (
                            <ProfileFieldInput
                              field={field}
                              isDisabled={submitting}
                              onChange={profileField.onChange}
                              value={profileField.value}
                            />
                          )}
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
