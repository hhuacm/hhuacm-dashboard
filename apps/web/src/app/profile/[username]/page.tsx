"use client";

import { Alert, Button, Card, Chip, Spinner } from "@heroui/react";
import {
  type MemberStatus,
  memberStatusLabels,
} from "@hhuacm-dashboard/domain";
import { useQuery } from "@tanstack/react-query";
import {
  CircleAlert,
  ExternalLink,
  LayoutDashboard,
  Medal,
  Settings,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { getCodeforcesRatingClassName } from "@/utils/codeforces-rating";
import { getOjPlatformConfig, type OjPlatform } from "@/utils/oj-platforms";
import { getProfileDisplayValue } from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";

const memberStatusConfig = {
  active: {
    className: "bg-success-soft text-success",
  },
  frozen: {
    className: "bg-black text-white",
  },
  retired: {
    className: "bg-default text-muted",
  },
  selection: {
    className: "bg-accent-soft text-accent",
  },
} as const satisfies Record<MemberStatus, { className: string }>;

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

interface PublicInfoItemProps {
  label: string;
  value: string;
}

interface PublicOjAccount {
  codeforces?: null | {
    acceptedProblemCount: null | number;
    acceptedProblemCountInMonth: null | number;
    fetchedAt: null | string;
    handle: string;
    isStale: boolean;
    lastAttemptedAt: string;
    lastError: null | string;
    lastOnlineAt: null | string;
    maxRating: null | number;
    rating: null | number;
    syncStatus: "empty" | "failed" | "ready" | "refreshing";
  };
  handle: string;
  luogu?: null | {
    acceptedProblemCount: null | number;
    acceptedWeightedScore: null | number;
    averageAcceptedDifficulty: null | number;
    difficultyCounts: {
      count: number;
      difficulty: number;
      label: string;
    }[];
    fetchedAt: null | string;
    lastError: null | string;
    syncStatus: "empty" | "failed" | "ready" | "refreshing";
  };
  platform: OjPlatform;
  profileUrl: string;
}

interface PublicProfileAward {
  contest: string;
  event: null | string;
  level: string;
  source: "luogu";
  sourceHandle: string;
  sourceProfileUrl: string;
  year: number;
}

interface PublicProfileAwards {
  fetchedAt: null | string;
  items: PublicProfileAward[];
  lastError: null | string;
  syncStatus: "empty" | "failed" | "ready" | "refreshing";
}

const luoguDifficultyClassNames = [
  "bg-[rgb(191,191,191)] text-[#333333]",
  "bg-[rgb(254,76,97)] text-white",
  "bg-[rgb(243,156,17)] text-white",
  "bg-[rgb(255,193,22)] text-[#713f12]",
  "bg-[rgb(83,196,26)] text-white",
  "bg-[rgb(52,152,219)] text-white",
  "bg-[rgb(156,61,207)] text-white",
  "bg-[rgb(14,29,105)] text-white",
] as const;

const awardLevelClassNames = {
  bronze:
    "!border-[#c7834f] !bg-[#e7b48a] !text-[#542b12] dark:!border-[#c4895a] dark:!bg-[#6b3f22] dark:!text-[#ffe6d0]",
  default:
    "!border-[#d8e0ea] !bg-[#eef2f7] !text-[#475569] dark:!border-[#3b4c68] dark:!bg-[#253349] dark:!text-[#d7e1ef]",
  gold: "!border-[#e5b94e] !bg-[#f9dfa0] !text-[#533700] dark:!border-[#d8aa42] dark:!bg-[#6f4e13] dark:!text-[#fff2c2]",
  silver:
    "!border-[#cbd5e1] !bg-[#e5e7eb] !text-[#334155] dark:!border-[#94a3b8] dark:!bg-[#475569] dark:!text-[#f8fafc]",
} as const;

const isMemberStatus = (
  status: null | string | undefined
): status is MemberStatus => Boolean(status && status in memberStatusConfig);

const isStatsDisabledMemberStatus = (
  status: null | string | undefined
): status is "frozen" | "retired" =>
  status === "frozen" || status === "retired";

function MemberStatusBadge({ status }: { status: null | string | undefined }) {
  const memberStatus = isMemberStatus(status) ? status : "selection";
  const config = memberStatusConfig[memberStatus];

  return (
    <Chip className={config.className} size="md" variant="soft">
      {memberStatusLabels[memberStatus]}
    </Chip>
  );
}

function PublicInfoItem({ label, value }: PublicInfoItemProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="mt-2 break-all font-medium text-base text-foreground">
        {value}
      </dd>
    </div>
  );
}

function formatNumber(value: null | number) {
  return value === null ? "—" : value.toLocaleString("zh-CN");
}

function formatDateTime(value: null | string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).format(new Date(value));
}

function getAwardLevelClassName(level: string) {
  if (level.includes("金") || level.includes("一等")) {
    return awardLevelClassNames.gold;
  }

  if (level.includes("银") || level.includes("二等")) {
    return awardLevelClassNames.silver;
  }

  if (level.includes("铜") || level.includes("三等")) {
    return awardLevelClassNames.bronze;
  }

  return awardLevelClassNames.default;
}

function AwardLevelChip({ level }: { level: string }) {
  return (
    <Chip
      className={`${getAwardLevelClassName(level)} min-h-9 border px-4 font-semibold text-base`}
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

function getAwardStatusText(awards: PublicProfileAwards) {
  if (awards.syncStatus === "refreshing") {
    return "后台刷新中";
  }

  if (awards.syncStatus === "failed") {
    return "刷新失败，显示旧数据";
  }

  return null;
}

function ProfileAwardsSection({
  awards,
}: {
  awards: PublicProfileAwards | undefined;
}) {
  if (!awards || awards.items.length === 0) {
    return null;
  }

  const statusText = getAwardStatusText(awards);
  const sourceProfileUrl = awards.items[0]?.sourceProfileUrl ?? "";

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
        <div className="mt-3 flex flex-col gap-2 text-muted text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {awards.fetchedAt ? (
              <span>更新于 {formatDateTime(awards.fetchedAt)}</span>
            ) : null}
            {statusText ? (
              <span
                className={
                  awards.syncStatus === "failed" ? "text-danger" : "text-accent"
                }
              >
                {statusText}
                {awards.lastError ? `：${awards.lastError}` : ""}
              </span>
            ) : null}
          </div>
          {sourceProfileUrl ? (
            <a
              className="inline-flex w-fit items-center gap-1 font-medium text-accent underline-offset-4 hover:underline focus-visible:underline"
              href={sourceProfileUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              来源：洛谷
              <ExternalLink className="size-3.5 shrink-0" />
            </a>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}

function CodeforcesMetric({
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
        className={`mt-1 font-semibold text-lg leading-snug ${valueClassName}`}
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
    <CodeforcesMetric
      label={label}
      value={formatNumber(rating)}
      valueClassName={getCodeforcesRatingClassName(rating)}
    />
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
        className={`${className} px-3 py-1 font-semibold text-base`}
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

function getCodeforcesStatusText(
  codeforces: PublicOjAccount["codeforces"] | undefined
) {
  if (!codeforces || codeforces.syncStatus === "empty") {
    return "等待刷新";
  }

  if (codeforces.syncStatus === "refreshing") {
    return codeforces.fetchedAt ? "后台刷新中" : "等待刷新";
  }

  if (codeforces.syncStatus === "failed") {
    return codeforces.fetchedAt ? "刷新失败，显示旧数据" : "刷新失败";
  }

  return codeforces.isStale ? "数据待刷新" : "数据已更新";
}

function getCodeforcesStatusClassName(
  codeforces: PublicOjAccount["codeforces"] | undefined
) {
  if (codeforces?.syncStatus === "failed") {
    return "text-danger";
  }

  if (codeforces?.syncStatus === "refreshing" || codeforces?.isStale) {
    return "text-accent";
  }

  return "text-muted";
}

function getLuoguStatusText(luogu: PublicOjAccount["luogu"] | undefined) {
  if (!luogu || luogu.syncStatus === "empty") {
    return "等待数据";
  }

  if (luogu.syncStatus === "refreshing") {
    return luogu.fetchedAt ? "后台刷新中" : "等待数据";
  }

  if (luogu.syncStatus === "failed") {
    return luogu.fetchedAt ? "刷新失败，显示旧数据" : "读取失败";
  }

  return "数据已更新";
}

function getLuoguStatusClassName(luogu: PublicOjAccount["luogu"] | undefined) {
  if (luogu?.syncStatus === "failed") {
    return "text-danger";
  }

  return luogu?.syncStatus === "ready" ? "text-muted" : "text-accent";
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
      <CodeforcesMetric
        label="AC 题数"
        value={formatNumber(codeforces?.acceptedProblemCount ?? null)}
      />
      <CodeforcesMetric
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
          className={`wrap-break-word mt-1 font-medium ${getCodeforcesStatusClassName(
            codeforces
          )}`}
        >
          {getCodeforcesStatusText(codeforces)}
          {codeforces?.lastError ? `：${codeforces.lastError}` : ""}
        </dd>
      </div>
    </dl>
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
        <CodeforcesMetric
          label="总过题数"
          value={formatNumber(luogu?.acceptedProblemCount ?? null)}
        />
        <CodeforcesMetric
          label="AC 加权分"
          value={formatNumber(luogu?.acceptedWeightedScore ?? null)}
        />
        <CodeforcesMetric
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

function OjAccountCard({
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
            {platform ? (
              <Image
                alt={`${platform.label} logo`}
                className="size-6 object-contain"
                height={24}
                src={platform.iconSrc}
                width={24}
              />
            ) : (
              <UserRound className="size-5 text-accent" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {platform?.label ?? account.platform}
            </p>
            {isCodeforces && !isStatsDisabled ? (
              <p
                className={`mt-1 inline-flex items-center gap-1 text-sm ${getCodeforcesStatusClassName(
                  codeforces
                )}`}
              >
                {codeforces?.syncStatus === "failed" ? (
                  <CircleAlert className="size-3.5" />
                ) : null}
                {getCodeforcesStatusText(codeforces)}
              </p>
            ) : null}
            {isLuogu && !isStatsDisabled ? (
              <p
                className={`mt-1 inline-flex items-center gap-1 text-sm ${getLuoguStatusClassName(
                  luogu
                )}`}
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
            className={`inline-flex min-w-0 items-center gap-2 break-all font-medium underline-offset-4 hover:underline focus-visible:underline ${
              isCodeforces && !isStatsDisabled
                ? getCodeforcesRatingClassName(codeforces?.rating)
                : "text-accent"
            }`}
            href={account.profileUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>{codeforces?.handle ?? account.handle}</span>
            <ExternalLink className="size-4 shrink-0" />
          </a>
        ) : (
          <span className="break-all font-medium text-foreground">
            {codeforces?.handle ?? account.handle}
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

export default function PublicProfilePage({ params }: ProfilePageProps) {
  const router = useRouter();
  const { username: routeUsername } = use(params);
  const username = decodeURIComponent(routeUsername);
  const profileQuery = useQuery(
    trpc.profile.get.queryOptions(
      { username },
      {
        retry: false,
      }
    )
  );
  const profile = profileQuery.data;
  const nameLabel = profile?.user.username ?? profile?.user.name ?? username;
  const canOpenSettings = profile?.permissions.isOwner;
  const canOpenAdmin = Boolean(
    profile?.permissions.isAdmin && !profile.permissions.isOwner
  );
  const isOjStatsDisabled = isStatsDisabledMemberStatus(
    profile?.profile.memberStatus
  );

  return (
    <AppShell
      icon={<UserRound className="size-4" />}
      maxWidth="5xl"
      title="个人主页"
    >
      <div className="grid gap-8">
        {profileQuery.isPending ? (
          <div className="flex items-center gap-3">
            <Spinner color="current" size="sm" />
            <p className="font-medium">正在读取个人主页。</p>
          </div>
        ) : null}

        {profileQuery.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>个人主页不存在</Alert.Title>
              <Alert.Description>
                没有找到用户名为 {username} 的成员。
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {profile ? (
          <>
            <Card>
              <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-border bg-default text-accent">
                    <UserRound className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <Card.Title className="break-all text-2xl leading-tight">
                      {nameLabel}
                    </Card.Title>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canOpenSettings ? (
                    <Button
                      onPress={() => router.push("/settings/profile" as Route)}
                      size="sm"
                      variant="secondary"
                    >
                      <Settings className="size-4" />
                      资料设置
                    </Button>
                  ) : null}
                  {canOpenAdmin ? (
                    <Button
                      onPress={() =>
                        router.push(
                          `/admin/users?username=${encodeURIComponent(
                            profile.user.username ?? username
                          )}` as Route
                        )
                      }
                      size="sm"
                      variant="secondary"
                    >
                      <LayoutDashboard className="size-4" />
                      管理用户
                    </Button>
                  ) : null}
                </div>
              </Card.Header>
              <Card.Content>
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <PublicInfoItem
                    label="用户名"
                    value={profile.user.username ?? "未设置"}
                  />
                  <PublicInfoItem label="邮箱" value={profile.user.email} />
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <dt className="text-muted text-sm">状态</dt>
                    <dd className="mt-2">
                      <MemberStatusBadge
                        status={profile.profile.memberStatus}
                      />
                    </dd>
                  </div>
                  <PublicInfoItem
                    label="姓名"
                    value={getProfileDisplayValue(profile.profile.realName)}
                  />
                  <PublicInfoItem
                    label="学号"
                    value={getProfileDisplayValue(profile.profile.studentId)}
                  />
                  <PublicInfoItem
                    label="年级"
                    value={getProfileDisplayValue(profile.profile.grade)}
                  />
                  <PublicInfoItem
                    label="专业"
                    value={getProfileDisplayValue(profile.profile.major)}
                  />
                </dl>
              </Card.Content>
            </Card>

            <ProfileAwardsSection awards={profile.awards} />

            <Card>
              <Card.Header className="pb-2">
                <Card.Title className="text-xl">OJ 账号</Card.Title>
              </Card.Header>
              <Card.Content>
                {profile.ojAccounts.length > 0 ? (
                  <div className="grid gap-3">
                    {profile.ojAccounts.map((account) => (
                      <OjAccountCard
                        account={account}
                        isStatsDisabled={isOjStatsDisabled}
                        key={account.platform}
                      />
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>
                        该成员暂未登记 OJ 账号。
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </Card.Content>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
