import { Alert } from "@heroui/react";
import { isStatsDisabledMemberStatus } from "@hhuacm-dashboard/domain";
import { UserRound } from "lucide-react";
import type { Route } from "next";

import { ServerAppShell } from "@/components/server-app-shell";
import { createServerCaller } from "@/utils/server-trpc";
import { OjAccountsSection } from "./_components/oj-accounts-section";
import { ProfileAwardsSection } from "./_components/profile-awards-section";
import { ProfileSummaryCard } from "./_components/profile-summary-card";

interface ProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username: routeUsername } = await params;
  const username = decodeURIComponent(routeUsername);
  const caller = await createServerCaller();
  const profileResult = await caller.profile.get
    .query({ username })
    .then((profile) => ({ profile, status: "success" as const }))
    .catch(() => ({ profile: null, status: "error" as const }));
  const profile = profileResult.profile;
  const usernameLabel = profile?.user.username ?? username;
  const isOjStatsDisabled = isStatsDisabledMemberStatus(
    profile?.profile.memberStatus
  );
  const adminHref = profile
    ? (`/admin/users?username=${encodeURIComponent(
        profile.user.username
      )}` as Route)
    : undefined;

  return (
    <ServerAppShell
      icon={<UserRound className="size-4" />}
      maxWidth="5xl"
      title="个人主页"
    >
      <div className="grid gap-8">
        {profileResult.status === "error" ? (
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
              adminHref={adminHref}
              profile={profile}
              settingsHref={"/settings/profile" satisfies Route}
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
    </ServerAppShell>
  );
}
