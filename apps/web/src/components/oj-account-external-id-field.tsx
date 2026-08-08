import { Input, TextField } from "@heroui/react";
import type { OjPlatform } from "@hhuacm-dashboard/domain";

import { ojAccountExternalIdPlaceholders } from "@/utils/oj-platforms";
import { DirtyFieldLabel } from "./dirty-field-label";

interface OjAccountExternalIdFieldProps {
  isChanged: boolean;
  isDisabled: boolean;
  onChange: (value: string) => void;
  platform: OjPlatform;
  value: string;
}

export function OjAccountExternalIdField({
  isChanged,
  isDisabled,
  onChange,
  platform,
  value,
}: OjAccountExternalIdFieldProps) {
  return (
    <TextField
      fullWidth
      isDisabled={isDisabled}
      name={`${platform}-external-id`}
      onChange={onChange}
      value={value}
    >
      <DirtyFieldLabel isChanged={isChanged} label="账号标识" />
      <Input
        autoComplete="off"
        placeholder={ojAccountExternalIdPlaceholders[platform]}
        variant="secondary"
      />
    </TextField>
  );
}
