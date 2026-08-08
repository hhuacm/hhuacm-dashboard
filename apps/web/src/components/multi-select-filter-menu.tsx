"use client";

import {
  Button,
  Checkbox,
  CheckboxGroup,
  Input,
  Label,
  Popover,
  TextField,
} from "@heroui/react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export interface MultiSelectFilterOption<Value extends string = string> {
  label: string;
  value: Value;
}

interface MultiSelectFilterMenuProps<Value extends string> {
  label: string;
  onChange: (values: Value[]) => void;
  options: readonly MultiSelectFilterOption<Value>[];
  selectedValues: readonly Value[];
}

const searchThreshold = 8;

export function MultiSelectFilterMenu<Value extends string>({
  label,
  onChange,
  options,
  selectedValues,
}: MultiSelectFilterMenuProps<Value>) {
  const [query, setQuery] = useState("");
  const selectedCount = selectedValues.length;
  const buttonLabel = selectedCount > 0 ? `${label} ${selectedCount}` : label;
  const searchQuery = query.trim().toLowerCase();
  const visibleOptions = searchQuery
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery)
      )
    : options;
  const shouldShowSearch = options.length >= searchThreshold;

  return (
    <Popover>
      <Button isDisabled={options.length === 0} size="sm" variant="outline">
        <SlidersHorizontal className="size-4" />
        {buttonLabel}
        <ChevronDown className="size-4" />
      </Button>
      <Popover.Content className="w-56">
        <Popover.Dialog className="grid gap-3">
          <Popover.Heading className="font-semibold text-sm">
            {label}筛选
          </Popover.Heading>
          {shouldShowSearch ? (
            <TextField fullWidth onChange={setQuery} value={query}>
              <Label className="sr-only">搜索{label}</Label>
              <Input
                autoComplete="off"
                placeholder={`搜索${label}`}
                variant="secondary"
              />
            </TextField>
          ) : null}
          {visibleOptions.length > 0 ? (
            <CheckboxGroup
              className="grid max-h-72 gap-2 overflow-y-auto pr-1"
              onChange={(values) => onChange(values as Value[])}
              value={[...selectedValues]}
            >
              {visibleOptions.map((option) => (
                <Checkbox key={option.value} value={option.value}>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>{option.label}</Label>
                  </Checkbox.Content>
                </Checkbox>
              ))}
            </CheckboxGroup>
          ) : (
            <p className="text-muted text-sm">没有匹配项</p>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
