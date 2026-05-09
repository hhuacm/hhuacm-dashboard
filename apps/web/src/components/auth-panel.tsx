"use client";

import {
  Alert,
  Button,
  Card,
  Fieldset,
  Form,
  Input,
  Label,
  Separator,
  Spinner,
  TextField,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";

import { authClient } from "@/utils/auth-client";
import {
  emptyProfileFormValues,
  type ProfileFieldKey,
  type ProfileFormValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";

export type AuthMode = "login" | "register";

interface AuthPanelProps {
  className?: string;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: () => Promise<void> | void;
}

const authCopy = {
  login: {
    description: "使用邮箱或用户名进入 HHUACM Dashboard。",
    submit: "登录",
    switchAction: "注册一个",
    switchPrompt: "还没有账号？",
    title: "欢迎回来",
  },
  register: {
    description: "使用用户名、邮箱和密码创建本地开发账号。",
    submit: "注册",
    switchAction: "去登录",
    switchPrompt: "已经有账号？",
    title: "创建账号",
  },
} as const;

const getAuthErrorMessage = (message: string | undefined, mode: AuthMode) => {
  if (!message) {
    return mode === "login"
      ? "登录失败，请稍后再试。"
      : "注册失败，请稍后再试。";
  }

  if (message.includes("Invalid email or password")) {
    return "邮箱或密码不正确。";
  }

  if (message.includes("Invalid username or password")) {
    return "用户名或密码不正确。";
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

const isEmailIdentifier = (value: string) => value.includes("@");

const signInWithIdentifier = (identifier: string, password: string) => {
  if (isEmailIdentifier(identifier)) {
    return authClient.signIn.email({
      email: identifier.toLowerCase(),
      password,
    });
  }

  return authClient.signIn.username({
    password,
    username: identifier,
  });
};

const signUpWithEmail = (username: string, email: string, password: string) =>
  authClient.signUp.email({
    displayUsername: username,
    email,
    name: username,
    password,
    username,
  });

const getValidationError = (
  mode: AuthMode,
  identifier: string,
  email: string,
  password: string
) => {
  if (!identifier) {
    return mode === "login" ? "请输入邮箱或用户名。" : "请输入用户名。";
  }

  if (mode === "register" && !email) {
    return "请输入邮箱。";
  }

  if (!password) {
    return "请输入密码。";
  }

  return "";
};

export function AuthPanel({
  className,
  mode,
  onModeChange,
  onSuccess,
}: AuthPanelProps) {
  const queryClient = useQueryClient();
  const [identifier, setIdentifier] = useState("");
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
  const copy = authCopy[mode];

  useEffect(() => {
    setError("");
    setProfileFormValues(emptyProfileFormValues);
    if (mode === "login") {
      setEmail("");
    }
  }, [mode]);

  const resetForm = () => {
    setIdentifier("");
    setEmail("");
    setPassword("");
    setProfileFormValues(emptyProfileFormValues);
    setError("");
    setSubmitting(false);
  };

  const handleProfileInputChange = (field: ProfileFieldKey, value: string) => {
    setProfileFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const submitAuthCredentials = (identifier: string, email: string) => {
    if (mode === "login") {
      return signInWithIdentifier(identifier, password);
    }

    return signUpWithEmail(identifier, email, password);
  };

  const saveRegistrationProfile = async () => {
    try {
      await updateProfile.mutateAsync(profileFormValues);
      return true;
    } catch {
      await onSuccess();
      setError("账号已创建，但个人信息保存失败，可稍后在个人信息页补填。");
      return false;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const validationError = getValidationError(
      mode,
      normalizedIdentifier,
      normalizedEmail,
      password
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await submitAuthCredentials(
        normalizedIdentifier,
        normalizedEmail
      );

      if (response.error) {
        setError(getAuthErrorMessage(response.error.message, mode));
        return;
      }

      if (mode === "register") {
        const profileSaved = await saveRegistrationProfile();

        if (!profileSaved) {
          return;
        }
      }

      await onSuccess();
      resetForm();
    } catch {
      setError("认证服务暂时不可用，请确认后端和数据库已启动。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeSwitch = () => {
    onModeChange(mode === "login" ? "register" : "login");
  };

  const rootClassName = ["w-full", className].filter(Boolean).join(" ");

  return (
    <Card className={rootClassName}>
      <Card.Header>
        <Card.Description>账号入口</Card.Description>
        <Card.Title className="text-xl">{copy.title}</Card.Title>
        <Card.Description>{copy.description}</Card.Description>
      </Card.Header>

      <Form className="contents" onSubmit={handleSubmit}>
        <Card.Content>
          <div className="flex flex-col gap-4">
            <TextField
              fullWidth
              isDisabled={submitting}
              name={mode === "login" ? "identifier" : "username"}
              onChange={setIdentifier}
              value={identifier}
            >
              <Label>{mode === "login" ? "邮箱或用户名" : "用户名"}</Label>
              <Input
                autoComplete="username"
                placeholder={
                  mode === "login" ? "邮箱或 hhuacmer" : "例如 hhuacmer"
                }
                variant="secondary"
              />
            </TextField>

            {mode === "register" ? (
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
            ) : null}

            {mode === "register" ? (
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
            ) : null}

            {mode === "register" ? <Separator /> : null}

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
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
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
            onPress={handleModeSwitch}
            type="button"
            variant="ghost"
          >
            {copy.switchPrompt}
            <span className="text-accent">{copy.switchAction}</span>
          </Button>
          <Button isPending={submitting} type="submit">
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : null}
                {isPending ? "处理中" : copy.submit}
              </>
            )}
          </Button>
        </Card.Footer>
      </Form>
    </Card>
  );
}
