"use client";

import { Button, InputGroup, Label, TextField } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordFieldProps {
  autoComplete: string;
  isDisabled?: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export function PasswordField({
  autoComplete,
  isDisabled = false,
  label,
  name,
  onChange,
  placeholder,
  value,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const toggleLabel = isVisible ? "隐藏密码" : "显示密码";

  return (
    <TextField
      fullWidth
      isDisabled={isDisabled}
      name={name}
      onChange={onChange}
      value={value}
    >
      <Label>{label}</Label>
      <InputGroup variant="secondary">
        <InputGroup.Input
          autoComplete={autoComplete}
          placeholder={placeholder}
          type={isVisible ? "text" : "password"}
        />
        <InputGroup.Suffix className="pr-2">
          <Button
            aria-label={toggleLabel}
            isDisabled={isDisabled}
            isIconOnly
            onPress={() => setIsVisible((currentValue) => !currentValue)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isVisible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}
