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
import { useId, useState } from "react";

export type AuthMode = "login" | "register";

export interface MockUser {
  username: string;
}

interface AuthDialogProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: MockUser) => void;
  open: boolean;
}

const authCopy = {
  login: {
    title: "欢迎回来",
    description: "使用你的 HHUACM Dashboard 账号进入工作台。",
    submit: "登录",
    switchPrompt: "还没有账号？",
    switchAction: "注册一个",
  },
  register: {
    title: "创建账号",
    description: "先用一个用户名和密码占位，后续再接入真实认证。",
    submit: "注册",
    switchPrompt: "已经有账号？",
    switchAction: "去登录",
  },
} as const;

export function AuthDialog({
  mode,
  open,
  onModeChange,
  onOpenChange,
  onSuccess,
}: AuthDialogProps) {
  const usernameId = useId();
  const passwordId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const copy = authCopy[mode];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      setError("请输入用户名。");
      return;
    }

    if (!password) {
      setError("请输入密码。");
      return;
    }

    onSuccess({ username: normalizedUsername });
    setUsername("");
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  const handleModeSwitch = () => {
    setError("");
    onModeChange(mode === "login" ? "register" : "login");
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
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
            <Label htmlFor={usernameId}>用户名</Label>
            <Input
              autoComplete="username"
              id={usernameId}
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="例如 hhuacmer"
              value={username}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={passwordId}>密码</Label>
            <Input
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
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
            <Button onClick={handleModeSwitch} type="button" variant="ghost">
              {copy.switchPrompt}
              <span className="text-primary">{copy.switchAction}</span>
            </Button>
            <Button type="submit">{copy.submit}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
