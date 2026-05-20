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

import { authClient, getPreferredUsername } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

const maxWidthClassNames = {
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;
const usernameVisibleLength = 20;

interface AppShellProps {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  maxWidth?: keyof typeof maxWidthClassNames;
  title: string;
}

interface AccountMenuProps {
  displayName: string;
  isAdmin: boolean;
  onLogout: () => Promise<void>;
  username: null | string | undefined;
}

const formatDisplayName = (username: string) => {
  if (username.length <= usernameVisibleLength) {
    return username;
  }

  return `${username.slice(0, usernameVisibleLength)}…`;
};

function AccountMenu({
  displayName,
  isAdmin,
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
          {displayName}
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

function MainNavigation() {
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

function HeaderActions({ action }: { action?: ReactNode }) {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
    })
  );
  const isAdmin = accountMe.data?.role === "admin";
  const displayUsername = user ? getPreferredUsername(user) : "";

  const handleLogout = async () => {
    await authClient.signOut();
    await session.refetch();
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {action}
      {user ? (
        <AccountMenu
          displayName={formatDisplayName(displayUsername)}
          isAdmin={isAdmin}
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
    <main className="min-h-svh bg-background text-foreground">
      <div
        className={`mx-auto flex min-h-svh w-full flex-col px-4 py-4 sm:px-6 lg:px-8 ${maxWidthClassNames[maxWidth]}`}
      >
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-accent shadow-surface">
                {icon}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-base leading-none">
                  {title}
                </p>
                {description ? (
                  <p className="mt-1 truncate text-muted text-sm">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <MainNavigation />
          </div>

          <div className="shrink-0">
            <HeaderActions action={action} />
          </div>
        </header>

        <div className="flex-1 py-8 sm:py-10">{children}</div>
      </div>
    </main>
  );
}
