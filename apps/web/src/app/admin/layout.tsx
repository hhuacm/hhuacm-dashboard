"use client";

import { Alert, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";
import { trpc } from "@/utils/trpc";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const accountMe = useQuery(
    trpc.account.me.queryOptions(undefined, {
      enabled: Boolean(user),
      retry: false,
    })
  );
  const isGuest = !(session.isPending || user);
  const isMember = Boolean(
    user &&
      !accountMe.isError &&
      accountMe.data &&
      accountMe.data.role !== "admin"
  );
  const isAdmin = !accountMe.isError && accountMe.data?.role === "admin";
  const hasAccessError = Boolean(
    user && !accountMe.isPending && (accountMe.isError || !accountMe.data)
  );

  useEffect(() => {
    if (isGuest) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (isMember) {
      router.replace("/");
    }
  }, [isGuest, isMember, pathname, router]);

  if (isAdmin) {
    return children;
  }

  return (
    <AppShell
      description="管理员控制台"
      icon={<LayoutDashboard className="size-4" />}
      maxWidth="4xl"
      title="管理面板"
    >
      {hasAccessError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>权限确认失败</Alert.Title>
            <Alert.Description>请刷新页面后重试。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <div className="flex items-center gap-3">
          <Spinner color="current" size="sm" />
          <p className="font-medium">正在确认管理员权限。</p>
        </div>
      )}
    </AppShell>
  );
}
