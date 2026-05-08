"use client";

import { Button } from "@hhuacm-dashboard/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hhuacm-dashboard/ui/components/dialog";
import { Input } from "@hhuacm-dashboard/ui/components/input";
import { Label } from "@hhuacm-dashboard/ui/components/label";
import { X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { authClient } from "@/utils/auth-client";

export type AuthMode = "login" | "register";

interface AuthDialogProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
  open: boolean;
}

const authCopy = {
  login: {
    title: "欢迎回来",
    description: "使用邮箱或用户名进入 HHUACM Dashboard。",
    submit: "登录",
    switchPrompt: "还没有账号？",
    switchAction: "注册一个",
  },
  register: {
    title: "创建账号",
    description: "使用用户名、邮箱和密码创建本地开发账号。",
    submit: "注册",
    switchPrompt: "已经有账号？",
    switchAction: "去登录",
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

export function AuthDialog({
  mode,
  open,
  onModeChange,
  onOpenChange,
  onSuccess,
}: AuthDialogProps) {
  const identifierId = useId();
  const emailId = useId();
  const passwordId = useId();
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const copy = authCopy[mode];

  const resetForm = () => {
    setIdentifier("");
    setEmail("");
    setPassword("");
    setError("");
    setSubmitting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedIdentifier) {
      setError(mode === "login" ? "请输入邮箱或用户名。" : "请输入用户名。");
      return;
    }

    if (mode === "register" && !normalizedEmail) {
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
      const response =
        mode === "login"
          ? await signInWithIdentifier(normalizedIdentifier, password)
          : await authClient.signUp.email({
              displayUsername: normalizedIdentifier,
              email: normalizedEmail,
              name: normalizedIdentifier,
              password,
              username: normalizedIdentifier,
            });

      if (response.error) {
        setError(getAuthErrorMessage(response.error.message, mode));
        return;
      }

      await onSuccess();
      handleOpenChange(false);
    } catch {
      setError("认证服务暂时不可用，请确认后端和数据库已启动。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeSwitch = () => {
    setError("");
    onModeChange(mode === "login" ? "register" : "login");
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="relative">
        <DialogClose
          render={
            <Button
              aria-label="关闭"
              className="absolute top-4 right-4"
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <X className="size-4" />
        </DialogClose>

        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={identifierId}>
              {mode === "login" ? "邮箱或用户名" : "用户名"}
            </Label>
            <Input
              autoComplete="username"
              disabled={submitting}
              id={identifierId}
              name={mode === "login" ? "identifier" : "username"}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={
                mode === "login" ? "邮箱或 hhuacmer" : "例如 hhuacmer"
              }
              value={identifier}
            />
          </div>

          {mode === "register" ? (
            <div className="grid gap-2">
              <Label htmlFor={emailId}>邮箱</Label>
              <Input
                autoComplete="email"
                disabled={submitting}
                id={emailId}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor={passwordId}>密码</Label>
            <Input
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              disabled={submitting}
              id={passwordId}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
              type="password"
              value={password}
            />
          </div>

          {error ? (
            <p className="border border-destructive/25 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <DialogFooter className="items-stretch sm:items-center">
            <Button
              disabled={submitting}
              onClick={handleModeSwitch}
              type="button"
              variant="ghost"
            >
              {copy.switchPrompt}
              <span className="text-primary">{copy.switchAction}</span>
            </Button>
            <Button disabled={submitting} type="submit">
              {submitting ? "处理中" : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
