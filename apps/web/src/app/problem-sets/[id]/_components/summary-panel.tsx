import { Card } from "@heroui/react";

import { MarkdownContent } from "@/components/markdown-content";
import { CompletionLeaderboardCard } from "./completion-leaderboard-card";

interface SummaryPanelProps {
  descriptionMarkdown: string;
  problemSetId: string;
}

export function SummaryPanel({
  descriptionMarkdown,
  problemSetId,
}: SummaryPanelProps) {
  return (
    <aside className="grid content-start gap-4">
      <Card>
        <Card.Header>
          <Card.Title>题单说明</Card.Title>
        </Card.Header>
        <Card.Content>
          <MarkdownContent
            emptyText="暂无题单说明。"
            markdown={descriptionMarkdown}
          />
        </Card.Content>
      </Card>
      <CompletionLeaderboardCard problemSetId={problemSetId} />
    </aside>
  );
}
