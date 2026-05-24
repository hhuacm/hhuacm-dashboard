import { Chip } from "@heroui/react";
import clsx from "clsx";
import { CircleAlert, ExternalLink } from "lucide-react";
import Image from "next/image";

import { getCodeforcesRatingClassName } from "@/utils/codeforces-rating";
import { getOjPlatformConfig } from "@/utils/oj-platforms";
import {
  formatDateTime,
  formatNumber,
  getCodeforcesStatusClassName,
  getCodeforcesStatusText,
  getLuoguStatusClassName,
  getLuoguStatusText,
  luoguDifficultyClassNames,
  type PublicOjAccount,
} from "../_model/public-profile-view";

function Metric({
  label,
  value,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
      <dt className="text-muted text-xs">{label}</dt>
      <dd
        className={clsx(
          "mt-1 font-semibold text-lg leading-snug",
          valueClassName
        )}
      >
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
      value={formatNumber(rating)}
      valueClassName={getCodeforcesRatingClassName(rating)}
    />
  );
}

function CodeforcesStatsContent({
  codeforces,
}: {
  codeforces: PublicOjAccount["codeforces"] | undefined;
}) {
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
            getCodeforcesStatusClassName(codeforces)
          )}
        >
          {getCodeforcesStatusText(codeforces)}
          {codeforces?.lastError ? `：${codeforces.lastError}` : ""}
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
  const className =
    luoguDifficultyClassNames[difficulty] ?? luoguDifficultyClassNames[0];

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-secondary px-3 py-2">
      <Chip
        className={clsx(className, "px-3 py-1 font-semibold text-base")}
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
  return (
    <div className="mt-4 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
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
      </div>
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
      {luogu?.syncStatus === "failed" ? (
        <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
          <dt className="text-muted text-xs">读取状态</dt>
          <dd className="wrap-break-word mt-1 font-medium text-danger">
            {getLuoguStatusText(luogu)}
            {luogu.lastError ? `：${luogu.lastError}` : ""}
          </dd>
        </div>
      ) : null}
      <div className="rounded-md border border-border bg-surface-secondary px-3 py-2">
        <dt className="text-muted text-xs">数据更新</dt>
        <dd className="mt-1 font-medium text-foreground">
          {formatDateTime(luogu?.fetchedAt ?? null)}
        </dd>
      </div>
    </div>
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
  const isCodeforces = account.platform === "codeforces";
  const isLuogu = account.platform === "luogu";
  const codeforces = account.codeforces;
  const luogu = account.luogu;

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
            {isCodeforces && !isStatsDisabled ? (
              <p
                className={clsx(
                  "mt-1 inline-flex items-center gap-1 text-sm",
                  getCodeforcesStatusClassName(codeforces)
                )}
              >
                {codeforces?.syncStatus === "failed" ? (
                  <CircleAlert className="size-3.5" />
                ) : null}
                {getCodeforcesStatusText(codeforces)}
              </p>
            ) : null}
            {isLuogu && !isStatsDisabled ? (
              <p
                className={clsx(
                  "mt-1 inline-flex items-center gap-1 text-sm",
                  getLuoguStatusClassName(luogu)
                )}
              >
                {luogu?.syncStatus === "failed" ? (
                  <CircleAlert className="size-3.5" />
                ) : null}
                {getLuoguStatusText(luogu)}
              </p>
            ) : null}
          </div>
        </div>

        {account.profileUrl ? (
          <a
            className={clsx(
              "inline-flex min-w-0 items-center gap-2 break-all font-medium underline-offset-4 hover:underline focus-visible:underline",
              isCodeforces && !isStatsDisabled
                ? getCodeforcesRatingClassName(codeforces?.rating)
                : "text-accent"
            )}
            href={account.profileUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>{account.handle}</span>
            <ExternalLink className="size-4 shrink-0" />
          </a>
        ) : (
          <span className="break-all font-medium text-foreground">
            {account.handle}
          </span>
        )}
      </div>

      {isCodeforces && !isStatsDisabled ? (
        <CodeforcesStatsContent codeforces={codeforces} />
      ) : null}

      {isLuogu && !isStatsDisabled ? <LuoguStatsContent luogu={luogu} /> : null}
    </div>
  );
}
