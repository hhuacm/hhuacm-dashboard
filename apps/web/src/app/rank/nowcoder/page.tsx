import { Trophy } from "lucide-react";

import { ServerAppShell } from "@/components/server-app-shell";
import { NowcoderRankContent } from "./_components/nowcoder-rank-content";

export default function NowcoderRankPage() {
  return (
    <ServerAppShell
      description="队内成员牛客数据"
      icon={<Trophy className="size-4" />}
      title="牛客排行榜"
    >
      <NowcoderRankContent />
    </ServerAppShell>
  );
}
