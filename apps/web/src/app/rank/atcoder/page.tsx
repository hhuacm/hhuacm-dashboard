import { Trophy } from "lucide-react";

import { ServerAppShell } from "@/components/server-app-shell";
import { AtcoderRankContent } from "./_components/atcoder-rank-content";

export default function AtcoderRankPage() {
  return (
    <ServerAppShell
      description="队内成员 AtCoder 数据"
      icon={<Trophy className="size-4" />}
      title="AtCoder 排行榜"
    >
      <AtcoderRankContent />
    </ServerAppShell>
  );
}
