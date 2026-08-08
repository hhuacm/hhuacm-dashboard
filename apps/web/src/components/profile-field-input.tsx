import { Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { getGradeOptionsWithCurrentValue } from "@hhuacm-dashboard/domain";

import type { ProfileFieldConfig } from "@/utils/profile-fields";
import { DirtyFieldLabel } from "./dirty-field-label";

interface ProfileFieldInputProps {
  field: ProfileFieldConfig;
  isChanged?: boolean;
  isDisabled?: boolean;
  onChange: (value: string) => void;
  value: string;
}

export function ProfileFieldInput({
  field,
  isChanged,
  isDisabled = false,
  onChange,
  value,
}: ProfileFieldInputProps) {
  const label =
    isChanged === undefined ? (
      <Label>{field.label}</Label>
    ) : (
      <DirtyFieldLabel isChanged={isChanged} label={field.label} />
    );

  if (field.key === "grade") {
    return (
      <Select
        fullWidth
        isDisabled={isDisabled}
        onSelectionChange={(key) =>
          onChange(typeof key === "string" ? key : "")
        }
        placeholder="请选择年级"
        selectedKey={value || null}
        variant="secondary"
      >
        {label}
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {getGradeOptionsWithCurrentValue(value).map((option) => (
              <ListBox.Item id={option} key={option} textValue={option}>
                {option}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    );
  }

  return (
    <TextField
      fullWidth
      isDisabled={isDisabled}
      name={field.key}
      onChange={onChange}
      value={value}
    >
      {label}
      <Input
        autoComplete={field.autoComplete}
        placeholder={`请输入${field.label}`}
        variant="secondary"
      />
    </TextField>
  );
}
