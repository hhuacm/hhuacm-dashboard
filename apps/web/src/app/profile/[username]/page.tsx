"use client";

import { Alert, Button, Card, Chip, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  LayoutDashboard,
  Settings,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { use } from "react";
import { AppShell } from "@/components/app-shell";
import { getOjPlatformConfig, type OjPlatform } from "@/utils/oj-platforms";
import { getProfileDisplayValue } from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";

const memberStatusConfig = {
  active: {
    className: "bg-success-soft text-success",
    label: "服役中",
  },
  frozen: {
    className: "bg-black text-white",
    label: "已冻结",
  },
  retired: {
    className: "bg-default text-muted",
    label: "已退役",
  },
  selection: {
    className: "bg-accent-soft text-accent",
    label: "选拔中",
  },
} as const;

type MemberStatus = keyof typeof memberStatusConfig;

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
  handle: string;
  platform: OjPlatform;
  profileUrl: string;
}

const isMemberStatus = (
  status: null | string | undefined
): status is MemberStatus => Boolean(status && status in memberStatusConfig);

function MemberStatusBadge({ status }: { status: null | string | undefined }) {
  const config = isMemberStatus(status)
    ? memberStatusConfig[status]
    : memberStatusConfig.selection;

  return (
    <Chip className={config.className} size="md" variant="soft">
      {config.label}
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

function OjAccountCard({ account }: { account: PublicOjAccount }) {
  const platform = getOjPlatformConfig(account.platform);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="text-muted text-sm">{platform?.name ?? "OJ"}</p>
        </div>
      </div>

      {account.profileUrl ? (
        <a
          className="inline-flex min-w-0 items-center gap-2 break-all font-medium text-accent underline-offset-4 hover:underline focus-visible:underline"
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
  const displayName =
    profile?.user.displayUsername ??
    profile?.user.username ??
    profile?.user.name ??
    username;
  const canOpenSettings = profile?.permissions.isOwner;
  const canOpenAdmin = Boolean(
    profile?.permissions.isAdmin && !profile.permissions.isOwner
  );

  const shellAction = (
    <Button onPress={() => router.push("/")} size="sm" variant="outline">
      <ArrowLeft className="size-4" />
      返回首页
    </Button>
  );

  return (
    <AppShell
      action={shellAction}
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
                      {displayName}
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

            <Card>
              <Card.Header className="pb-2">
                <Card.Title className="text-xl">OJ 账号</Card.Title>
              </Card.Header>
              <Card.Content>
                {profile.ojAccounts.length > 0 ? (
                  <div className="grid gap-3">
                    {profile.ojAccounts.map((account) => (
                      <OjAccountCard account={account} key={account.platform} />
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
