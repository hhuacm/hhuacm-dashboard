import { Card } from "@heroui/react";
import { LayoutDashboard, Settings, UserRound } from "lucide-react";
import type { Route } from "next";

import { InfoItem } from "@/components/info-item";
import { MemberStatusChip } from "@/components/member-status-chip";
import { getProfileDisplayValue } from "@/utils/profile-fields";
import type { PublicProfile } from "../_model/public-profile-view";

type PublicProfileSummary = Pick<
  PublicProfile,
  "permissions" | "profile" | "user"
>;

interface ProfileSummaryCardProps {
  adminHref?: Route;
  profile: PublicProfileSummary;
  settingsHref?: Route;
  usernameLabel: string;
}

export function ProfileSummaryCard({
  adminHref,
  profile,
  settingsHref,
  usernameLabel,
}: ProfileSummaryCardProps) {
  const canOpenSettings = profile.permissions.isOwner && settingsHref;
  const canOpenAdmin =
    profile.permissions.isAdmin && !profile.permissions.isOwner && adminHref;

  return (
    <Card>
      <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-lg border border-border bg-default text-accent">
            <UserRound className="size-6" />
          </div>
          <div className="min-w-0">
            <Card.Title className="break-all text-2xl leading-tight">
              {usernameLabel}
            </Card.Title>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canOpenSettings ? (
            <a
              className="button button--secondary button--sm"
              href={settingsHref}
            >
              <Settings className="size-4" />
              资料设置
            </a>
          ) : null}
          {canOpenAdmin ? (
            <a className="button button--secondary button--sm" href={adminHref}>
              <LayoutDashboard className="size-4" />
              管理用户
            </a>
          ) : null}
        </div>
      </Card.Header>
      <Card.Content>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="用户名" value={profile.user.username} />
          <InfoItem label="邮箱" value={profile.user.email} />
          <InfoItem
            label="状态"
            value={<MemberStatusChip status={profile.profile.memberStatus} />}
          />
          <InfoItem
            label="姓名"
            value={getProfileDisplayValue(profile.profile.realName)}
          />
          <InfoItem
            label="学号"
            value={getProfileDisplayValue(profile.profile.studentId)}
          />
          <InfoItem
            label="年级"
            value={getProfileDisplayValue(profile.profile.grade)}
          />
          <InfoItem
            label="专业"
            value={getProfileDisplayValue(profile.profile.major)}
          />
        </dl>
      </Card.Content>
    </Card>
  );
}
