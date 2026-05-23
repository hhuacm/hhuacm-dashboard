"use client";

import { Spinner } from "@heroui/react";
import { UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";

export default function ProfileRedirectPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!user) {
      router.replace("/login?redirect=/profile");
      return;
    }

    router.replace(`/profile/${user.username}` as Route);
  }, [router, session.isPending, user]);

  return (
    <AppShell
      description="打开公开个人主页"
      icon={<UserRound className="size-4" />}
      maxWidth="4xl"
      title="个人主页"
    >
      <div className="flex items-center gap-3">
        <Spinner color="current" size="sm" />
        <p className="font-medium">正在前往个人主页。</p>
      </div>
    </AppShell>
  );
}
