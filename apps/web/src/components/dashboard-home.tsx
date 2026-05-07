"use client";

import { Button } from "@hhuacm-dashboard/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Activity, Database, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { trpc } from "@/utils/trpc";

import { AccountMenu } from "./account-menu";
import { AuthDialog, type AuthMode, type MockUser } from "./auth-dialog";

const SESSION_USER_KEY = "hhuacm-dashboard:user";
const USERNAME_VISIBLE_LENGTH = 20;

const statusLabel = (isLoading: boolean, isError: boolean) => {
  if (isLoading) {
    return "Connecting";
  }

  if (isError) {
    return "Unavailable";
  }

  return "Online";
};

const statusClassName = (isLoading: boolean, isError: boolean) => {
  if (isLoading) {
    return "bg-sky-100 text-sky-700";
  }

  if (isError) {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-emerald-100 text-emerald-700";
};

const readStoredUser = () => {
  const storedValue = sessionStorage.getItem(SESSION_USER_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      typeof parsedValue === "object" &&
      parsedValue !== null &&
      "username" in parsedValue &&
      typeof parsedValue.username === "string"
    ) {
      return { username: parsedValue.username };
    }
  } catch {
    sessionStorage.removeItem(SESSION_USER_KEY);
  }

  return null;
};

const formatDisplayName = (username: string) => {
  if (username.length <= USERNAME_VISIBLE_LENGTH) {
    return username;
  }

  return `${username.slice(0, USERNAME_VISIBLE_LENGTH)}…`;
};

export function DashboardHome() {
  const health = useQuery(trpc.health.queryOptions());
  const [user, setUser] = useState<MockUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const status = statusLabel(health.isLoading, health.isError);

  useEffect(() => {
    setUser(readStoredUser());
  }, []);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleAuthSuccess = (nextUser: MockUser) => {
    sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_USER_KEY);
    setUser(null);
  };

  return (
    <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#f8fdff_0%,#edf8ff_48%,#ffffff_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.055)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-sky-100/80 border-b bg-background/70 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center border border-sky-200 bg-sky-50 text-sky-700 shadow-sky-100 shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-base leading-none">
                HHUACM Dashboard
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Contest Operations Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <AccountMenu
                displayName={formatDisplayName(user.username)}
                onLogout={handleLogout}
              />
            ) : (
              <>
                <Button
                  onClick={() => openAuth("login")}
                  size="lg"
                  variant="ghost"
                >
                  登录
                </Button>
                <Button onClick={() => openAuth("register")} size="lg">
                  注册
                </Button>
              </>
            )}
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:py-16">
          <div className="max-w-2xl">
            <p className="font-medium text-sky-700 text-sm uppercase tracking-[0.18em]">
              HHU ACM
            </p>
            <h1 className="mt-5 text-pretty font-semibold text-5xl leading-[1.02] tracking-normal sm:text-6xl">
              Elegant control room for team operations.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-8">
              一处清爽的竞赛工作台入口。现在先完成账号入口、登录态导航和后端连通状态，后续再接入真实认证与数据。
            </p>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                { label: "Members", value: "Ready" },
                { label: "Health", value: status },
                { label: "Auth", value: user ? "Signed in" : "Mock" },
              ].map((item) => (
                <div
                  className="border border-sky-100 bg-card/80 p-4 shadow-sm"
                  key={item.label}
                >
                  <p className="text-muted-foreground text-xs">{item.label}</p>
                  <p className="mt-2 font-semibold text-lg">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="border border-sky-100 bg-card/90 p-5 shadow-sky-950/5 shadow-xl backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
                    Dashboard Preview
                  </p>
                  <h2 className="mt-2 font-semibold text-2xl">Overview</h2>
                </div>
                <span className="border border-sky-200 bg-sky-50 px-3 py-1 font-medium text-sky-700 text-xs">
                  Ice Blue
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {[
                  { icon: Activity, title: "Contest pulse", value: "Stable" },
                  {
                    icon: ShieldCheck,
                    title: "Mock session",
                    value: user ? user.username : "Guest",
                  },
                  { icon: Database, title: "Service health", value: status },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="flex items-center justify-between gap-4 border border-sky-100 bg-sky-50/45 p-4"
                      key={item.title}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-9 shrink-0 place-items-center border border-sky-200 bg-white text-sky-700">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{item.title}</p>
                          <p className="truncate text-muted-foreground text-sm">
                            {item.value}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-20 bg-sky-100">
                        <div className="h-full w-2/3 bg-sky-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-sky-100 bg-card/80 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-medium text-lg">Service Health</h2>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Fetched from the API server.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 font-medium text-sm ${statusClassName(health.isLoading, health.isError)}`}
                >
                  {status}
                </span>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-sm">Service</dt>
                  <dd className="mt-1 font-medium">
                    {health.data?.service ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Runtime</dt>
                  <dd className="mt-1 font-medium">
                    {health.data
                      ? `${health.data.runtime.name} ${health.data.runtime.version}`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">System</dt>
                  <dd className="mt-1 font-medium">
                    {health.data
                      ? `${health.data.system.platform} ${health.data.system.arch}`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Checked At</dt>
                  <dd className="mt-1 font-medium">
                    {health.data?.checkedAt ?? "-"}
                  </dd>
                </div>
              </dl>

              {health.isError ? (
                <p className="mt-5 border border-destructive/25 bg-destructive/10 px-3 py-2 text-destructive text-sm">
                  后端暂时不可用。启动 API 服务后这里会自动恢复。
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <AuthDialog
        mode={authMode}
        onModeChange={setAuthMode}
        onOpenChange={setAuthOpen}
        onSuccess={handleAuthSuccess}
        open={authOpen}
      />
    </main>
  );
}
