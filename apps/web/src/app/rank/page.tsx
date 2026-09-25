"use client";

import { Button, Card } from "@heroui/react";
import { type OjPlatform, ojPlatformLabels } from "@hhuacm-dashboard/domain";
import { Trophy } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";

const rankPlatformOrder = [
  "codeforces",
  "atcoder",
  "luogu",
  "nowcoder",
] as const satisfies readonly OjPlatform[];

const rankRoutes = rankPlatformOrder.map((platform) => ({
  href: `/rank/${platform}` as Route,
  label: `${ojPlatformLabels[platform]} 排行榜`,
  platform,
}));

export default function RankPage() {
  const router = useRouter();

  return (
    <AppShell
      description="队内公开榜单"
      icon={<Trophy className="size-4" />}
      maxWidth="4xl"
      title="排行榜"
    >
      <Card>
        <Card.Header>
          <div>
            <Card.Title className="mt-1">排行榜</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="grid gap-4">
          {rankRoutes.map(({ href, label, platform }) => (
            <Button
              className="justify-start"
              key={platform}
              onPress={() => router.push(href)}
              size="lg"
              variant="outline"
            >
              <Trophy className="size-4" />
              {label}
            </Button>
          ))}
        </Card.Content>
      </Card>
    </AppShell>
  );
}
