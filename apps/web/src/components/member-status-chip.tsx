import { Chip } from "@heroui/react";
import {
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
  status: MemberStatus;
}) {
  return (
    <Chip color={memberStatusColors[status]} size={size} variant="soft">
      {memberStatusLabels[status]}
    </Chip>
  );
}
