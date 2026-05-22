import { Button, Card } from "@heroui/react";
import { LayoutDashboard, Settings, UserRound } from "lucide-react";

import { getProfileDisplayValue } from "@/utils/profile-fields";
import { MemberStatusBadge } from "./member-status-badge";

interface PublicProfileSummary {
  permissions: {
    isAdmin: boolean;
    isOwner: boolean;
  };
  profile: {
    grade: null | string;
    major: null | string;
    memberStatus: null | string;
    realName: null | string;
    studentId: null | string;
  };
  user: {
    email: string;
    username: null | string;
  };
}

interface PublicInfoItemProps {
  label: string;
  value: string;
}

interface ProfileSummaryCardProps {
  nameLabel: string;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
  profile: PublicProfileSummary;
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

export function ProfileSummaryCard({
  nameLabel,
  onOpenAdmin,
  onOpenSettings,
  profile,
}: ProfileSummaryCardProps) {
  const canOpenSettings = profile.permissions.isOwner;
  const canOpenAdmin =
    profile.permissions.isAdmin && !profile.permissions.isOwner;

  return (
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
            <Button onPress={onOpenSettings} size="sm" variant="secondary">
              <Settings className="size-4" />
              资料设置
            </Button>
          ) : null}
          {canOpenAdmin ? (
            <Button onPress={onOpenAdmin} size="sm" variant="secondary">
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
              <MemberStatusBadge status={profile.profile.memberStatus} />
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
  );
}
