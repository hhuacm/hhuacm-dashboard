import { Chip } from "@heroui/react";
import clsx from "clsx";
import { CircleAlert, ExternalLink } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { getCodeforcesRatingClassName } from "@/utils/codeforces-rating";
import { getLuoguDifficultyPresentation } from "@/utils/luogu-difficulty";
import { buildOjProfileUrl, getOjPlatformConfig } from "@/utils/oj-platforms";
import {
  codeforcesStatsStatusOptions,
  formatDateTime,
  formatNumber,
  getStatsStatusPresentation,
  luoguStatsStatusOptions,
  type PublicOjAccount,
  type StatsStatusPresentation,
  type StatsStatusTone,
} from "../_model/public-profile-view";

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground text-lg leading-snug">
        {value}
      </dd>
    </div>
  );
}

function CodeforcesRatingMetric({
  label,
  rating,
}: {
  label: string;
  rating: null | number;
}) {
  return (
    <Metric
      label={label}
      value={
        <span className={getCodeforcesRatingClassName(rating)}>
          {formatNumber(rating)}
        </span>
      }
    />
  );
}

const statsStatusToneClassNames = {
  accent: "text-accent",
  danger: "text-danger",
  muted: "text-muted",
} as const satisfies Record<StatsStatusTone, string>;

function CodeforcesStatsContent({
  codeforces,
}: {
  codeforces: PublicOjAccount["codeforces"] | undefined;
}) {
  const status = getStatsStatusPresentation(
    codeforces,
    codeforcesStatsStatusOptions
  );

  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CodeforcesRatingMetric
        label="当前 Rating"
        rating={codeforces?.rating ?? null}
      />
      <CodeforcesRatingMetric
        label="最高 Rating"
        rating={codeforces?.maxRating ?? null}
      />
      <Metric
        label="AC 题数"
        value={formatNumber(codeforces?.acceptedProblemCount ?? null)}
      />
      <Metric
        label="近 30 天 AC"
        value={formatNumber(codeforces?.acceptedProblemCountInMonth ?? null)}
      />
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2 sm:col-span-2">
        <dt className="text-muted text-xs">最近活跃</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatDateTime(codeforces?.lastOnlineAt ?? null)}
        </dd>
      </div>
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2 sm:col-span-2">
        <dt className="text-muted text-xs">数据更新</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatDateTime(codeforces?.fetchedAt ?? null)}
        </dd>
      </div>
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2 sm:col-span-2 lg:col-span-4">
        <dt className="text-muted text-xs">刷新状态</dt>
        <dd
          className={clsx(
            "wrap-break-word mt-1 font-medium",
            statsStatusToneClassNames[status.tone]
          )}
        >
          {status.text}
        </dd>
      </div>
    </dl>
  );
}

function AtcoderStatsContent({
  atcoder,
}: {
  atcoder: PublicOjAccount["atcoder"] | undefined;
}) {
  const status = getStatsStatusPresentation(atcoder);

  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      <Metric
        label="当前 Rating"
        value={formatNumber(atcoder?.rating ?? null)}
      />
      <Metric
        label="近三场 Performance 均值"
        value={formatNumber(atcoder?.recentPerformanceAverage ?? null)}
      />
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
        <dt className="text-muted text-xs">数据更新</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatDateTime(atcoder?.fetchedAt ?? null)}
        </dd>
      </div>
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
        <dt className="text-muted text-xs">刷新状态</dt>
        <dd
          className={clsx(
            "wrap-break-word mt-1 font-medium",
            statsStatusToneClassNames[status.tone]
          )}
        >
          {status.text}
        </dd>
      </div>
    </dl>
  );
}

function LuoguDifficultyRow({
  count,
  difficulty,
  label,
}: {
  count: number;
  difficulty: number;
  label: string;
}) {
  const presentation = getLuoguDifficultyPresentation(difficulty);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-secondary px-3 py-2">
      <Chip
        className={clsx(
          presentation.className,
          "px-3 py-1 font-semibold text-base"
        )}
        size="md"
      >
        {label}
      </Chip>
      <span className="shrink-0 font-semibold text-foreground">
        {formatNumber(count)} 题
      </span>
    </div>
  );
}

function LuoguStatsContent({
  luogu,
}: {
  luogu: PublicOjAccount["luogu"] | undefined;
}) {
  const status = getStatsStatusPresentation(luogu, luoguStatsStatusOptions);

  return (
    <div className="mt-4 grid gap-3">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="总过题数"
          value={formatNumber(luogu?.acceptedProblemCount ?? null)}
        />
        <Metric
          label="AC 加权分"
          value={formatNumber(luogu?.acceptedWeightedScore ?? null)}
        />
        <Metric
          label="平均难度"
          value={
            luogu?.averageAcceptedDifficulty === null ||
            luogu?.averageAcceptedDifficulty === undefined
              ? "—"
              : luogu.averageAcceptedDifficulty.toFixed(2)
          }
        />
      </dl>
      <div className="grid gap-2 sm:grid-cols-2">
        {luogu?.difficultyCounts.map((item) => (
          <LuoguDifficultyRow
            count={item.count}
            difficulty={item.difficulty}
            key={item.difficulty}
            label={item.label}
          />
        ))}
      </div>
      <dl className="grid gap-3">
        {luogu?.syncStatus === "failed" ? (
          <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
            <dt className="text-muted text-xs">读取状态</dt>
            <dd className="wrap-break-word mt-1 font-medium text-danger">
              {status.text}
            </dd>
          </div>
        ) : null}
        <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
          <dt className="text-muted text-xs">数据更新</dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatDateTime(luogu?.fetchedAt ?? null)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function NowcoderStatsContent({
  nowcoder,
}: {
  nowcoder: PublicOjAccount["nowcoder"] | undefined;
}) {
  const status = getStatsStatusPresentation(nowcoder);

  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      <Metric label="Rating" value={formatNumber(nowcoder?.rating ?? null)} />
      <Metric
        label="AC 题数"
        value={formatNumber(nowcoder?.acceptedProblemCount ?? null)}
      />
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
        <dt className="text-muted text-xs">数据更新</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatDateTime(nowcoder?.fetchedAt ?? null)}
        </dd>
      </div>
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
        <dt className="text-muted text-xs">刷新状态</dt>
        <dd
          className={clsx(
            "wrap-break-word mt-1 font-medium",
            statsStatusToneClassNames[status.tone]
          )}
        >
          {status.text}
        </dd>
      </div>
    </dl>
  );
}

function OjAccountStatusLine({ account }: { account: PublicOjAccount }) {
  if (account.platform === "atcoder") {
    return <StatusLine status={getStatsStatusPresentation(account.atcoder)} />;
  }

  if (account.platform === "codeforces") {
    return (
      <StatusLine
        status={getStatsStatusPresentation(
          account.codeforces,
          codeforcesStatsStatusOptions
        )}
      />
    );
  }

  if (account.platform === "luogu") {
    return (
      <StatusLine
        status={getStatsStatusPresentation(
          account.luogu,
          luoguStatsStatusOptions
        )}
      />
    );
  }

  if (account.platform === "nowcoder") {
    return <StatusLine status={getStatsStatusPresentation(account.nowcoder)} />;
  }

  return null;
}

function StatusLine({ status }: { status: StatsStatusPresentation }) {
  return (
    <p
      className={clsx(
        "mt-1 inline-flex items-center gap-1 text-sm",
        statsStatusToneClassNames[status.tone]
      )}
    >
      {status.tone === "danger" ? <CircleAlert className="size-3.5" /> : null}
      {status.text}
    </p>
  );
}

function OjAccountStatsContent({ account }: { account: PublicOjAccount }) {
  if (account.platform === "atcoder") {
    return <AtcoderStatsContent atcoder={account.atcoder} />;
  }

  if (account.platform === "codeforces") {
    return <CodeforcesStatsContent codeforces={account.codeforces} />;
  }

  if (account.platform === "luogu") {
    return <LuoguStatsContent luogu={account.luogu} />;
  }

  if (account.platform === "nowcoder") {
    return <NowcoderStatsContent nowcoder={account.nowcoder} />;
  }

  return null;
}

function OjAccountIdentity({
  account,
  isStatsDisabled,
  profileUrl,
}: {
  account: PublicOjAccount;
  isStatsDisabled: boolean;
  profileUrl: string;
}) {
  const isCodeforces = account.platform === "codeforces";
  const codeforces = account.codeforces;
  const handleClassName = clsx(
    "inline-flex min-w-0 max-w-full items-center gap-2 break-all font-medium underline-offset-4 hover:underline focus-visible:underline",
    isCodeforces && !isStatsDisabled
      ? getCodeforcesRatingClassName(codeforces?.rating)
      : "text-accent"
  );
  const handleContent = (
    <>
      <span>{account.handle}</span>
      <ExternalLink className="size-4 shrink-0" />
    </>
  );

  return (
    <span className="grid min-w-0 justify-items-start gap-0.5 sm:justify-items-end sm:text-right">
      {profileUrl ? (
        <a
          className={handleClassName}
          href={profileUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {handleContent}
        </a>
      ) : (
        <span className="max-w-full break-all font-medium text-foreground">
          {account.handle}
        </span>
      )}
      {account.externalId === account.handle ? null : (
        <span className="max-w-full break-all font-mono text-muted text-xs">
          ID: {account.externalId}
        </span>
      )}
    </span>
  );
}

export function OjAccountCard({
  account,
  isStatsDisabled,
}: {
  account: PublicOjAccount;
  isStatsDisabled: boolean;
}) {
  const platform = getOjPlatformConfig(account.platform);
  const profileUrl = buildOjProfileUrl(account.platform, account.externalId);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-default">
            <Image
              alt={`${platform.label} logo`}
              className="size-6 object-contain"
              height={24}
              src={platform.iconSrc}
              width={24}
            />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{platform.label}</p>
            {isStatsDisabled ? null : <OjAccountStatusLine account={account} />}
          </div>
        </div>

        <OjAccountIdentity
          account={account}
          isStatsDisabled={isStatsDisabled}
          profileUrl={profileUrl}
        />
      </div>

      {isStatsDisabled ? null : <OjAccountStatsContent account={account} />}
    </div>
  );
}
