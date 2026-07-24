import { Chip } from "@heroui/react";
import {
  defaultMemberStatus,
  isMemberStatus,
  type MemberStatus,
  memberStatusLabels,
} from "@hhuacm-dashboard/domain";

const memberStatusColors = {
  active: "success",
  frozen: "danger",
  retired: "default",
  selection: "accent",
} as const satisfies Record<
  MemberStatus,
  "accent" | "danger" | "default" | "success"
>;

export function MemberStatusChip({
  size = "md",
  status,
}: {
  size?: "md" | "sm";
  status: null | string | undefined;
}) {
  const memberStatus = isMemberStatus(status) ? status : defaultMemberStatus;

  return (
    <Chip color={memberStatusColors[memberStatus]} size={size} variant="soft">
      {memberStatusLabels[memberStatus]}
    </Chip>
  );
}
