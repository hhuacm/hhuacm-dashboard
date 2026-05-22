"use client";

import { Trophy } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { LuoguRankContent } from "./_components/luogu-rank-content";

export default function LuoguRankPage() {
  return (
    <AppShell
      description="队内成员洛谷 AC 数据"
      icon={<Trophy className="size-4" />}
      title="洛谷排行榜"
    >
      <LuoguRankContent />
    </AppShell>
  );
}
