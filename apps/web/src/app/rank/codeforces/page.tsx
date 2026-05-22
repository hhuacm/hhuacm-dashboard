"use client";

import { Trophy } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CodeforcesRankContent } from "./_components/codeforces-rank-content";

export default function CodeforcesRankPage() {
  return (
    <AppShell
      description="队内成员 CF 数据"
      icon={<Trophy className="size-4" />}
      title="Codeforces 排行榜"
    >
      <CodeforcesRankContent />
    </AppShell>
  );
}
