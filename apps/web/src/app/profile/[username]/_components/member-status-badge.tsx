import { Chip } from "@heroui/react";
import { defaultMemberStatus, isMemberStatus } from "@hhuacm-dashboard/domain";

import {
  getMemberStatusLabel,
  memberStatusConfig,
} from "../_model/public-profile-view";

export function MemberStatusBadge({
  status,
}: {
  status: null | string | undefined;
}) {
  const memberStatus = isMemberStatus(status) ? status : defaultMemberStatus;
  const config = memberStatusConfig[memberStatus];

  return (
    <Chip className={config.className} size="md" variant="soft">
      {getMemberStatusLabel(memberStatus)}
    </Chip>
  );
}
