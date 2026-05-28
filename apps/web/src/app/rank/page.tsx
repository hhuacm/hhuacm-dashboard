"use client";

import { Button, Card } from "@heroui/react";
import { Trophy } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";

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
          <Button
            className="justify-start"
            onPress={() => router.push("/rank/codeforces" as Route)}
            size="lg"
            variant="outline"
          >
            <Trophy className="size-4" />
            Codeforces 排行榜
          </Button>
          <Button
            className="justify-start"
            onPress={() => router.push("/rank/atcoder" as Route)}
            size="lg"
            variant="outline"
          >
            <Trophy className="size-4" />
            AtCoder 排行榜
          </Button>
          <Button
            className="justify-start"
            onPress={() => router.push("/rank/luogu" as Route)}
            size="lg"
            variant="outline"
          >
            <Trophy className="size-4" />
            洛谷排行榜
          </Button>
          <Button
            className="justify-start"
            onPress={() => router.push("/rank/nowcoder" as Route)}
            size="lg"
            variant="outline"
          >
            <Trophy className="size-4" />
            牛客排行榜
          </Button>
        </Card.Content>
      </Card>
    </AppShell>
  );
}
