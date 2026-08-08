"use client";

import { Alert, Spinner } from "@heroui/react";
import { LayoutDashboard } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AppShell } from "@/components/app-shell";
import { authClient } from "@/utils/auth-client";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user ?? null;
  const isGuest = !(session.error || session.isPending || user);
  const isMember = Boolean(user && user.role !== "admin");
  const isAdmin = user?.role === "admin";
  const hasAccessError = Boolean(session.error);

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
