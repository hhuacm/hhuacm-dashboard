import { Chip } from "@heroui/react";

import {
  getMemberStatusLabel,
  isMemberStatus,
  memberStatusConfig,
} from "../_model/public-profile-view";

export function MemberStatusBadge({
  status,
}: {
  status: null | string | undefined;
}) {
  const memberStatus = isMemberStatus(status) ? status : "selection";
  const config = memberStatusConfig[memberStatus];

  return (
    <Chip className={config.className} size="md" variant="soft">
      {getMemberStatusLabel(memberStatus)}
    </Chip>
  );
}
