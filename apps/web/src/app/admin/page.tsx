"use client";

import { Button, Card } from "@heroui/react";
import { LayoutDashboard, Plus, Settings, UsersRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";

export default function AdminPage() {
  const router = useRouter();

  return (
    <AppShell
      description="管理员控制台"
      icon={<LayoutDashboard className="size-4" />}
      maxWidth="4xl"
      title="管理面板"
    >
      <div className="grid gap-4">
        <Card>
          <Card.Header>
            <div>
              <Card.Title className="mt-1">管理面板</Card.Title>
            </div>
          </Card.Header>
          <Card.Content className="grid gap-4">
            <Button
              className="justify-start"
              onPress={() => router.push("/admin/users" as Route)}
              size="lg"
              variant="outline"
            >
              <UsersRound className="size-4" />
              用户列表
            </Button>
            <Button
              className="justify-start"
              onPress={() => router.push("/admin/problem-sets/import" as Route)}
              size="lg"
              variant="outline"
            >
              <Plus className="size-4" />
              导入题单
            </Button>
            <Button
              className="justify-start"
              onPress={() => router.push("/admin/settings" as Route)}
              size="lg"
              variant="outline"
            >
              <Settings className="size-4" />
              全局设置
            </Button>
          </Card.Content>
        </Card>
      </div>
    </AppShell>
  );
}
