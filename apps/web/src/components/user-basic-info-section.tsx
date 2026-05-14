"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Form,
  Input,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextField,
} from "@heroui/react";
import { Pencil, Save } from "lucide-react";
import {
  type FormEvent,
  type Key,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import {
  buildProfileFormValues,
  emptyProfileFormValues,
  getChangedProfileValues,
  getGradeOptionsWithCurrentValue,
  getProfileDisplayValue,
  hasProfileUpdateValues,
  type ProfileData,
  type ProfileFieldKey,
  type ProfileFormValues,
  type ProfileUpdateValues,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { DirtyFieldLabel } from "./dirty-field-label";

const memberStatusConfig = {
  active: {
    className: "bg-success-soft text-success",
    label: "服役中",
  },
  frozen: {
    className: "bg-black text-white",
    label: "已冻结",
  },
  retired: {
    className: "bg-default text-muted",
    label: "已退役",
  },
  selection: {
    className: "bg-accent-soft text-accent",
    label: "选拔中",
  },
} as const;

type MemberStatus = keyof typeof memberStatusConfig;

export interface UserBasicInfoMessage {
  text: string;
  tone: "danger" | "success";
}

export type UserBasicInfoProfile = ProfileData & {
  memberStatus?: null | string;
};

interface UserBasicInfoSectionProps {
  isError: boolean;
  isLoading: boolean;
  isSaving: boolean;
  message: null | UserBasicInfoMessage;
  onClearMessage?: () => void;
  onSubmit: (values: ProfileUpdateValues) => Promise<void>;
  profile: null | UserBasicInfoProfile | undefined;
}

interface BasicInfoItemProps {
  label: string;
  value: ReactNode;
}

interface BasicInfoFieldInputProps {
  field: (typeof profileFieldConfigs)[number];
  gradeOptions: string[];
  isChanged?: boolean;
  isDisabled?: boolean;
  onChange: (field: ProfileFieldKey, value: string) => void;
  value: string;
}

const isMemberStatus = (
  status: null | string | undefined
): status is MemberStatus => Boolean(status && status in memberStatusConfig);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "保存失败，请稍后再试。";
};

function BasicInfoItem({ label, value }: BasicInfoItemProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-muted text-sm">{label}</dt>
      <dd className="mt-2 break-all font-medium text-base text-foreground">
        {value}
      </dd>
    </div>
  );
}

function MemberStatusBadge({ status }: { status: null | string | undefined }) {
  const config = isMemberStatus(status)
    ? memberStatusConfig[status]
    : memberStatusConfig.selection;

  return (
    <Chip className={config.className} size="md" variant="soft">
      {config.label}
    </Chip>
  );
}

function BasicInfoFieldInput({
  field,
  gradeOptions,
  isChanged = false,
  isDisabled = false,
  onChange,
  value,
}: BasicInfoFieldInputProps) {
  if (field.key === "grade") {
    const handleGradeChange = (key: Key | null) => {
      onChange(field.key, typeof key === "string" ? key : "");
    };

    return (
      <Select
        fullWidth
        isDisabled={isDisabled}
        onSelectionChange={handleGradeChange}
        placeholder="未填写"
        selectedKey={value || null}
        variant="secondary"
      >
        <DirtyFieldLabel isChanged={isChanged} label={field.label} />
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="" textValue="未填写">
              未填写
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {gradeOptions.map((option) => (
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
      onChange={(nextValue) => onChange(field.key, nextValue)}
      value={value}
    >
      <DirtyFieldLabel isChanged={isChanged} label={field.label} />
      <Input
        autoComplete={field.autoComplete}
        placeholder="未填写"
        variant="secondary"
      />
    </TextField>
  );
}

export function UserBasicInfoSection({
  isError,
  isLoading,
  isSaving,
  message,
  onClearMessage,
  onSubmit,
  profile,
}: UserBasicInfoSectionProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formValues, setFormValues] = useState<ProfileFormValues>(
    emptyProfileFormValues
  );
  const [originalFormValues, setOriginalFormValues] =
    useState<ProfileFormValues>(emptyProfileFormValues);
  const [dialogMessage, setDialogMessage] =
    useState<null | UserBasicInfoMessage>(null);

  useEffect(() => {
    if (isEditorOpen) {
      return;
    }

    const nextFormValues = buildProfileFormValues(profile);
    setFormValues(nextFormValues);
    setOriginalFormValues(nextFormValues);
  }, [isEditorOpen, profile]);

  const changedProfileValues = getChangedProfileValues(
    formValues,
    originalFormValues
  );
  const hasProfileChanges = hasProfileUpdateValues(changedProfileValues);
  const gradeOptions = getGradeOptionsWithCurrentValue(
    originalFormValues.grade
  );

  const openEditor = () => {
    const nextFormValues = buildProfileFormValues(profile);
    setFormValues(nextFormValues);
    setOriginalFormValues(nextFormValues);
    setDialogMessage(null);
    onClearMessage?.();
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    if (isSaving) {
      return;
    }

    setIsEditorOpen(false);
  };

  const handleInputChange = (field: ProfileFieldKey, value: string) => {
    setDialogMessage(null);
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDialogMessage(null);
    onClearMessage?.();

    if (!hasProfileUpdateValues(changedProfileValues)) {
      setDialogMessage({
        text: "没有需要保存的修改。",
        tone: "success",
      });
      return;
    }

    try {
      await onSubmit(changedProfileValues);
      setIsEditorOpen(false);
    } catch (error) {
      setDialogMessage({
        text: getErrorMessage(error),
        tone: "danger",
      });
    }
  };

  return (
    <>
      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="font-semibold text-xl">基础信息</h2>
          <Button
            isDisabled={isLoading || isError || isSaving}
            onPress={openEditor}
            size="sm"
            variant="secondary"
          >
            <Pencil className="size-4" />
            编辑
          </Button>
        </Card.Header>
        <Card.Content className="grid gap-4">
          {isLoading ? (
            <Alert>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>正在读取个人信息。</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  个人信息加载失败，请刷新页面重试。
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {message ? (
            <Alert status={message.tone}>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{message.text}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <BasicInfoItem
              label="状态"
              value={<MemberStatusBadge status={profile?.memberStatus} />}
            />
            {profileFieldConfigs.map((field) => (
              <BasicInfoItem
                key={field.key}
                label={field.label}
                value={getProfileDisplayValue(profile?.[field.key])}
              />
            ))}
          </dl>
        </Card.Content>
      </Card>

      <Modal.Backdrop isOpen={isEditorOpen} onOpenChange={closeEditor}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-150">
            <Modal.CloseTrigger isDisabled={isSaving} />
            <Form className="contents" onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Icon className="bg-default">
                  <Pencil className="size-5 text-accent" />
                </Modal.Icon>
                <Modal.Heading>编辑基础信息</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4 px-0.5 pt-3 pb-0.5">
                {dialogMessage ? (
                  <Alert status={dialogMessage.tone}>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>
                        {dialogMessage.text}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  {profileFieldConfigs.map((field) => (
                    <BasicInfoFieldInput
                      field={field}
                      gradeOptions={gradeOptions}
                      isChanged={field.key in changedProfileValues}
                      isDisabled={isLoading || isSaving}
                      key={field.key}
                      onChange={handleInputChange}
                      value={formValues[field.key]}
                    />
                  ))}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  isDisabled={isSaving}
                  onPress={closeEditor}
                  variant="secondary"
                >
                  取消
                </Button>
                <Button
                  isDisabled={isLoading || !hasProfileChanges}
                  isPending={isSaving}
                  type="submit"
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? (
                        <Spinner color="current" size="sm" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {isPending ? "保存中" : "保存"}
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
