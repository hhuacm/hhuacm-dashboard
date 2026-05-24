import { Card, Chip } from "@heroui/react";
import clsx from "clsx";
import { Medal } from "lucide-react";

import {
  formatDateTime,
  getAwardLevelClassName,
  getAwardStatusText,
  type PublicProfileAward,
  type PublicProfileAwards,
} from "../_model/public-profile-view";

function AwardLevelChip({ level }: { level: string }) {
  return (
    <Chip
      className={clsx(
        getAwardLevelClassName(level),
        "min-h-9 border px-4 font-semibold text-base"
      )}
      size="md"
      variant="soft"
    >
      {level}
    </Chip>
  );
}

function ProfileAwardRow({ award }: { award: PublicProfileAward }) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface-secondary px-3 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-start">
      <time
        className="inline-flex h-9 w-fit min-w-18 items-center justify-center rounded-md border border-border bg-surface px-3 font-semibold text-base text-foreground sm:w-20"
        dateTime={String(award.year)}
      >
        {award.year}
      </time>
      <div className="min-w-0 sm:self-center">
        <p className="wrap-break-word font-semibold text-foreground">
          {award.contest}
        </p>
        {award.event ? (
          <p className="wrap-break-word mt-1 text-muted text-sm leading-6">
            {award.event}
          </p>
        ) : null}
      </div>
      <div className="sm:self-center sm:justify-self-end">
        <AwardLevelChip level={award.level} />
      </div>
    </div>
  );
}

export function ProfileAwardsSection({
  awards,
}: {
  awards: PublicProfileAwards | undefined;
}) {
  if (!awards || awards.items.length === 0) {
    return null;
  }

  const statusText = getAwardStatusText(awards);

  return (
    <Card>
      <Card.Header className="flex items-center gap-3 pb-2">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-default text-accent">
          <Medal className="size-4" />
        </div>
        <Card.Title className="text-xl">获奖经历</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="grid gap-2">
          {awards.items.map((award, index) => (
            <ProfileAwardRow
              award={award}
              key={`${award.source}-${award.year}-${award.contest}-${award.level}-${index}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-muted text-sm">
          {awards.fetchedAt ? (
            <span>更新于 {formatDateTime(awards.fetchedAt)}</span>
          ) : null}
          {statusText ? (
            <span
              className={clsx(
                awards.syncStatus === "failed" ? "text-danger" : "text-accent"
              )}
            >
              {statusText}
            </span>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}
