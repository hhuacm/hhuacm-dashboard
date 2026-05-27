"use client";

import { Button, Dropdown, Label, Separator } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Trophy,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { type Key, useState } from "react";

import { authClient, getUsernameLabel } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";
import { AppShellLayout, type AppShellMaxWidth } from "./app-shell-layout";

const usernameVisibleLength = 20;

interface AppShellProps {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  maxWidth?: AppShellMaxWidth;
  title: string;
}

interface AccountMenuProps {
  isAdmin: boolean;
  nameLabel: string;
  onLogout: () => Promise<void>;
  username: null | string | undefined;
}

const formatNameLabel = (username: string) => {
  if (username.length <= usernameVisibleLength) {
    return username;
  }

  return `${username.slice(0, usernameVisibleLength)}…`;
};

function AccountMenu({
  isAdmin,
  nameLabel,
  onLogout,
  username,
}: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    onLogout().catch(() => undefined);
  };

  const handleAction = (key: Key) => {
    if (key === "profile") {
      setOpen(false);
      router.push(username ? (`/profile/${username}` as Route) : "/profile");
      return;
    }

    if (key === "settings") {
      setOpen(false);
      router.push("/settings/profile" as Route);
      return;
    }

    if (key === "admin") {
      setOpen(false);
      router.push("/admin" as Route);
      return;
    }

    if (key === "logout") {
      handleLogout();
    }
  };

  return (
    <Dropdown isOpen={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <Button
        aria-label="打开账号菜单"
        className="max-w-48 justify-start"
        size="sm"
        variant="outline"
      >
        <UserRound className="size-4" />
        <span className="max-w-36 overflow-hidden text-ellipsis">
          {nameLabel}
        </span>
      </Button>
      <Dropdown.Popover className="min-w-44" placement="bottom end">
        <Dropdown.Menu onAction={handleAction}>
          <Dropdown.Item id="profile" textValue="个人主页">
            <UserRound className="size-4" />
            <Label>个人主页</Label>
          </Dropdown.Item>
          <Dropdown.Item id="settings" textValue="资料设置">
            <Settings className="size-4" />
            <Label>资料设置</Label>
          </Dropdown.Item>
          {isAdmin ? (
            <Dropdown.Item id="admin" textValue="管理面板">
              <LayoutDashboard className="size-4" />
              <Label>管理面板</Label>
            </Dropdown.Item>
          ) : null}
          <Separator />
          <Dropdown.Item id="logout" textValue="注销" variant="danger">
            <LogOut className="size-4" />
            <Label>注销</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export function AppShellNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav aria-label="主导航" className="flex items-center gap-2">
      <Button
        isDisabled={pathname === "/"}
        onPress={() => router.push("/")}
        size="sm"
        variant="outline"
      >
        <Home className="size-4" />
        首页
      </Button>
      <Button
        isDisabled={pathname === "/rank"}
        onPress={() => router.push("/rank" as Route)}
        size="sm"
        variant="outline"
      >
        <Trophy className="size-4" />
        排行榜
      </Button>
      <Button
        isDisabled={pathname.startsWith("/problem-sets")}
        onPress={() => router.push("/problem-sets" as Route)}
        size="sm"
        variant="outline"
      >
        <ListChecks className="size-4" />
        题单
      </Button>
    </nav>
  );
}

export function AppShellHeaderActions({ action }: { action?: ReactNode }) {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
    })
  );
  const isAdmin = accountMe.data?.role === "admin";
  const username = user ? getUsernameLabel(user) : "";

  const handleLogout = async () => {
    await authClient.signOut();
    await session.refetch();
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {action}
      {user ? (
        <AccountMenu
          isAdmin={isAdmin}
          nameLabel={formatNameLabel(username)}
          onLogout={handleLogout}
          username={user.username}
        />
      ) : (
        <>
          <Button
            onPress={() => router.push("/login" as Route)}
            size="sm"
            variant="ghost"
          >
            登录
          </Button>
          <Button onPress={() => router.push("/register" as Route)} size="sm">
            注册
          </Button>
        </>
      )}
    </div>
  );
}

export function AppShell({
  action,
  children,
  description,
  icon,
  maxWidth = "6xl",
  title,
}: AppShellProps) {
  return (
    <AppShellLayout
      description={description}
      headerActions={<AppShellHeaderActions action={action} />}
      icon={icon}
      maxWidth={maxWidth}
      navigation={<AppShellNavigation />}
      title={title}
    >
      {children}
    </AppShellLayout>
  );
}
