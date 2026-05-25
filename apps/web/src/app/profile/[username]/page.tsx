"use client";

import { Alert, Spinner } from "@heroui/react";
import { isStatsDisabledMemberStatus } from "@hhuacm-dashboard/domain";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { use } from "react";

import { AppShell } from "@/components/app-shell";
import { trpc } from "@/utils/trpc";
import { OjAccountsSection } from "./_components/oj-accounts-section";
import { ProfileAwardsSection } from "./_components/profile-awards-section";
import { ProfileSummaryCard } from "./_components/profile-summary-card";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
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
  const usernameLabel = profile?.user.username ?? username;
  const isOjStatsDisabled = isStatsDisabledMemberStatus(
    profile?.profile.memberStatus
  );

  const openSettings = () => {
    router.push("/settings/profile" as Route);
  };

  const openAdmin = () => {
    if (!profile) {
      return;
    }

    router.push(
      `/admin/users?username=${encodeURIComponent(
        profile.user.username
      )}` as Route
    );
  };

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
            <ProfileSummaryCard
              onOpenAdmin={openAdmin}
              onOpenSettings={openSettings}
              profile={profile}
              usernameLabel={usernameLabel}
            />
            <ProfileAwardsSection awards={profile.awards} />
            <OjAccountsSection
              accounts={profile.ojAccounts}
              isStatsDisabled={isOjStatsDisabled}
            />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
