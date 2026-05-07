"use client";

import { Button } from "@hhuacm-dashboard/ui/components/button";
import { ArrowLeft, BadgeCheck, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { authClient, getPreferredUsername } from "@/utils/auth-client";

export default function ProfilePage() {
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  let profileContent: ReactNode;

  if (session.isPending) {
    profileContent = (
      <div className="grid gap-3">
        <p className="font-semibold text-2xl">正在确认登录状态</p>
        <p className="text-muted-foreground">
          请稍候，正在从认证服务读取当前会话。
        </p>
      </div>
    );
  } else if (user) {
    profileContent = (
      <div className="grid gap-7">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center border border-sky-200 bg-sky-50 text-sky-700">
            <BadgeCheck className="size-5" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Signed in as</p>
            <h1 className="mt-1 break-all font-semibold text-3xl">
              {getPreferredUsername(user)}
            </h1>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="border border-sky-100 bg-sky-50/45 p-4">
            <dt className="text-muted-foreground text-sm">用户名</dt>
            <dd className="mt-2 break-all font-medium text-lg">
              {getPreferredUsername(user)}
            </dd>
          </div>
          <div className="border border-sky-100 bg-sky-50/45 p-4">
            <dt className="text-muted-foreground text-sm">用户 ID</dt>
            <dd className="mt-2 break-all font-medium text-lg">{user.id}</dd>
          </div>
        </dl>
      </div>
    );
  } else {
    profileContent = (
      <div className="grid gap-5">
        <div>
          <p className="font-semibold text-2xl">尚未登录</p>
          <p className="mt-3 text-muted-foreground">
            回到首页完成登录后，这里会显示你的用户名和用户 ID。
          </p>
        </div>
        <div>
          <Button render={<Link href="/" />} size="lg">
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-[linear-gradient(180deg,#f8fdff_0%,#edf8ff_48%,#ffffff_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.055)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-4xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-sky-100/80 border-b bg-background/70 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center border border-sky-200 bg-sky-50 text-sky-700 shadow-sky-100 shadow-sm">
              <UserRound className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-base leading-none">个人信息</p>
              <p className="mt-1 text-muted-foreground text-xs">
                HHUACM Dashboard
              </p>
            </div>
          </div>

          <Button render={<Link href="/" />} size="lg" variant="outline">
            <ArrowLeft className="size-4" />
            返回首页
          </Button>
        </header>

        <section className="grid flex-1 content-center py-12">
          <div className="border border-sky-100 bg-card/90 p-6 shadow-sky-950/5 shadow-xl backdrop-blur sm:p-8">
            {profileContent}
          </div>
        </section>
      </div>
    </main>
  );
}
