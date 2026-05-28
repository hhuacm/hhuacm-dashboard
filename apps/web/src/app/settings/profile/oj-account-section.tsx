"use client";

import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Chip,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextField,
} from "@heroui/react";
import { isOjPlatform, type OjPlatform } from "@hhuacm-dashboard/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { type Key, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { DirtyFieldLabel } from "@/components/dirty-field-label";
import {
  buildOjProfileUrl,
  getOjPlatformConfig,
  ojPlatformConfigs,
} from "@/utils/oj-platforms";
import { trpc } from "@/utils/trpc";

interface OjAccount {
  externalId: string;
  handle: string;
  platform: OjPlatform;
}

interface OjAccountSectionProps {
  accounts: OjAccount[];
  isError: boolean;
  isLoading: boolean;
}

interface OjAccountMessage {
  text: string;
  tone: "danger" | "success";
}

type AccountDialog =
  | {
      mode: "add";
    }
  | {
      mode: "edit";
      platform: OjPlatform;
    };

interface OjAccountFormValues {
  externalId: string;
  platform: OjPlatform;
}

const emptyOjAccountFormValues: OjAccountFormValues = {
  externalId: "",
  platform: "luogu",
};

const ojAccountFormSchema = z.object({
  externalId: z.string().min(1, "请填写 OJ 账号标识。"),
  platform: z.custom<OjPlatform>(
    (value) => typeof value === "string" && isOjPlatform(value),
    { message: "请选择 OJ 平台。" }
  ),
}) satisfies z.ZodType<OjAccountFormValues>;

const getOriginalDialogExternalId = (
  accountsByPlatform: Map<OjPlatform, OjAccount>,
  dialog: AccountDialog | null
) => {
  if (dialog?.mode !== "edit") {
    return "";
  }

  return accountsByPlatform.get(dialog.platform)?.externalId ?? "";
};

const isOjExternalIdChanged = (
  dialog: AccountDialog | null,
  externalId: string,
  originalExternalId: string
) => dialog?.mode === "edit" && externalId !== originalExternalId;

const ojAccountExternalIdPlaceholders: Record<OjPlatform, string> = {
  atcoder: "AtCoder 用户名",
  codeforces: "Codeforces Handle",
  luogu: "洛谷 UID",
  nowcoder: "牛客 UID",
};

const getErrorText = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }

  const message = Reflect.get(error, "message");

  return typeof message === "string" ? message : "";
};

const getOjAccountErrorMessage = (error: unknown) => {
  const errorText = getErrorText(error);

  if (errorText.includes("OJ account already exists")) {
    return "该平台已登记，请直接修改已有账号。";
  }

  if (errorText.includes("OJ external ID already exists")) {
    return "该平台账号标识已被其他用户登记。";
  }

  if (errorText.includes("OJ account does not exist")) {
    return "该平台尚未登记。";
  }

  if (errorText.includes("User does not exist")) {
    return "当前用户不存在，请重新登录后再试。";
  }

  return "操作失败，请稍后再试。";
};

function OjAccountHandle({ account }: { account: OjAccount | undefined }) {
  if (!account) {
    return null;
  }

  const profileUrl = buildOjProfileUrl(account.platform, account.externalId);
  const handleElement = profileUrl ? (
    <a
      className="max-w-full break-all font-medium text-accent underline-offset-4 hover:underline focus-visible:underline"
      href={profileUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {account.handle}
    </a>
  ) : (
    <span className="max-w-full break-all font-medium text-foreground">
      {account.handle}
    </span>
  );

  return (
    <span className="grid justify-items-start gap-0.5 sm:justify-items-end">
      {handleElement}
      {account.externalId === account.handle ? null : (
        <span className="break-all font-mono text-muted text-xs">
          ID: {account.externalId}
        </span>
      )}
    </span>
  );
}

export function OjAccountSection({
  accounts,
  isError,
  isLoading,
}: OjAccountSectionProps) {
  const queryClient = useQueryClient();
  const settingsProfileQueryKey = trpc.settings.profile.get.queryKey();
  const [dialog, setDialog] = useState<AccountDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OjAccount | null>(null);
  const [message, setMessage] = useState<OjAccountMessage | null>(null);
  const [dialogMessage, setDialogMessage] = useState<OjAccountMessage | null>(
    null
  );
  const [deleteMessage, setDeleteMessage] = useState<OjAccountMessage | null>(
    null
  );
  const form = useForm<OjAccountFormValues>({
    defaultValues: emptyOjAccountFormValues,
    resolver: zodResolver(ojAccountFormSchema),
  });
  const { control, handleSubmit: handleFormSubmit, reset, watch } = form;
  const formValues = watch();

  const accountsByPlatform = useMemo(() => {
    const nextAccounts = new Map<OjPlatform, OjAccount>();

    for (const account of accounts) {
      nextAccounts.set(account.platform, account);
    }

    return nextAccounts;
  }, [accounts]);

  const availablePlatforms = ojPlatformConfigs.filter(
    (config) => !accountsByPlatform.has(config.key)
  );
  const hasAvailablePlatform = availablePlatforms.length > 0;
  const canAddAccount = hasAvailablePlatform;

  const invalidateAccounts = async () => {
    await queryClient.invalidateQueries({ queryKey: settingsProfileQueryKey });
  };

  const addAccount = useMutation(
    trpc.settings.ojAccount.add.mutationOptions({
      onError: (error) => {
        setDialogMessage({
          text: getOjAccountErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateAccounts();
        setDialog(null);
        setMessage({
          text: "OJ 账号已添加。",
          tone: "success",
        });
      },
    })
  );

  const updateAccount = useMutation(
    trpc.settings.ojAccount.update.mutationOptions({
      onError: (error) => {
        setDialogMessage({
          text: getOjAccountErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateAccounts();
        setDialog(null);
        setMessage({
          text: "OJ 账号已更新。",
          tone: "success",
        });
      },
    })
  );

  const deleteAccount = useMutation(
    trpc.settings.ojAccount.delete.mutationOptions({
      onError: (error) => {
        setDeleteMessage({
          text: getOjAccountErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateAccounts();
        setDeleteTarget(null);
        setMessage({
          text: "OJ 账号已删除。",
          tone: "success",
        });
      },
    })
  );

  const isSaving = addAccount.isPending || updateAccount.isPending;
  const isBusy = isSaving || deleteAccount.isPending;
  const dialogPlatformConfig = getOjPlatformConfig(formValues.platform);
  const originalDialogExternalId = getOriginalDialogExternalId(
    accountsByPlatform,
    dialog
  );
  const isExternalIdChanged = isOjExternalIdChanged(
    dialog,
    formValues.externalId,
    originalDialogExternalId
  );
  const dialogTitle =
    dialog?.mode === "edit"
      ? `编辑 ${dialogPlatformConfig.label} 账号`
      : "添加 OJ 账号";

  const openAddDialog = (platform?: OjPlatform) => {
    const nextPlatform = platform ?? availablePlatforms[0]?.key;

    if (!nextPlatform) {
      return;
    }

    setDialog({ mode: "add" });
    reset({
      externalId: "",
      platform: nextPlatform,
    });
    setMessage(null);
    setDialogMessage(null);
  };

  const openEditDialog = (account: OjAccount) => {
    setDialog({ mode: "edit", platform: account.platform });
    reset({
      externalId: account.externalId,
      platform: account.platform,
    });
    setMessage(null);
    setDialogMessage(null);
  };

  const closeDialog = () => {
    if (isSaving) {
      return;
    }

    setDialog(null);
  };

  const handlePlatformSelectionChange = (
    key: Key | null,
    onChange: (value: OjPlatform) => void
  ) => {
    if (typeof key !== "string" || !isOjPlatform(key)) {
      return;
    }

    setDialogMessage(null);
    onChange(key);
  };

  const handleSubmit = handleFormSubmit(
    (values) => {
      if (!dialog) {
        return;
      }

      setMessage(null);
      setDialogMessage(null);

      if (dialog.mode === "add") {
        addAccount.mutate({
          externalId: values.externalId,
          platform: values.platform,
        });
        return;
      }

      updateAccount.mutate({
        externalId: values.externalId,
        platform: dialog.platform,
      });
    },
    (errors) => {
      setDialogMessage({
        text:
          errors.externalId?.message ??
          errors.platform?.message ??
          "请检查 OJ 账号信息。",
        tone: "danger",
      });
    }
  );

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return;
    }

    setMessage(null);
    setDeleteMessage(null);
    deleteAccount.mutate({ platform: deleteTarget.platform });
  };

  return (
    <>
      <Card>
        <Card.Header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="font-semibold text-xl">OJ 账号</h2>
          <Button
            isDisabled={!canAddAccount || isBusy}
            onPress={() => openAddDialog()}
            size="sm"
          >
            <Plus className="size-4" />
            添加账号
          </Button>
        </Card.Header>
        <Card.Content className="grid gap-4">
          {isLoading ? (
            <Alert>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>正在读取 OJ 账号。</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  OJ 账号加载失败，请刷新页面重试。
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

          <div className="grid gap-3">
            {ojPlatformConfigs.map((platform) => {
              const account = accountsByPlatform.get(platform.key);
              const isDeletingThisAccount =
                deleteAccount.isPending &&
                deleteTarget?.platform === platform.key;

              return (
                <div
                  className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={platform.key}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-default">
                      <Image
                        alt={`${platform.label} logo`}
                        className="size-6 object-contain"
                        height={24}
                        src={platform.iconSrc}
                        width={24}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {platform.label}
                      </p>
                      <p className="text-muted text-sm">{platform.name}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                      <Chip
                        color={account ? "success" : "default"}
                        size="sm"
                        variant="soft"
                      >
                        {account ? "已登记" : "未登记"}
                      </Chip>
                      <OjAccountHandle account={account} />
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {account ? (
                        <>
                          <Button
                            isDisabled={isBusy}
                            onPress={() => openEditDialog(account)}
                            size="sm"
                            variant="secondary"
                          >
                            <Pencil className="size-4" />
                            编辑
                          </Button>
                          <Button
                            isDisabled={isBusy}
                            isPending={isDeletingThisAccount}
                            onPress={() => {
                              setDeleteTarget(account);
                              setMessage(null);
                              setDeleteMessage(null);
                            }}
                            size="sm"
                            variant="danger"
                          >
                            <Trash2 className="size-4" />
                            删除
                          </Button>
                        </>
                      ) : (
                        <Button
                          isDisabled={isBusy}
                          onPress={() => openAddDialog(platform.key)}
                          size="sm"
                          variant="secondary"
                        >
                          <Plus className="size-4" />
                          添加
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Content>
      </Card>

      <Modal.Backdrop isOpen={Boolean(dialog)} onOpenChange={closeDialog}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-105">
            <Modal.CloseTrigger isDisabled={isSaving} />
            <Form className="contents" onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Icon className="bg-default">
                  <Image
                    alt={`${dialogPlatformConfig.label} logo`}
                    className="size-6 object-contain"
                    height={24}
                    src={dialogPlatformConfig.iconSrc}
                    width={24}
                  />
                </Modal.Icon>
                <Modal.Heading>{dialogTitle}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4 px-0.5 pt-3 pb-0.5">
                {dialog?.mode === "add" ? (
                  <Controller
                    control={control}
                    name="platform"
                    render={({ field }) => (
                      <Select
                        fullWidth
                        isDisabled={isSaving}
                        onSelectionChange={(key) =>
                          handlePlatformSelectionChange(key, field.onChange)
                        }
                        placeholder="选择平台"
                        selectedKey={field.value}
                        variant="secondary"
                      >
                        <Label>平台</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {availablePlatforms.map((platform) => (
                              <ListBox.Item
                                id={platform.key}
                                key={platform.key}
                                textValue={platform.label}
                              >
                                {platform.label}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  />
                ) : null}

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

                <Controller
                  control={control}
                  name="externalId"
                  render={({ field }) => (
                    <TextField
                      fullWidth
                      isDisabled={isSaving}
                      name={field.name}
                      onChange={(value) => {
                        setDialogMessage(null);
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <DirtyFieldLabel
                        isChanged={isExternalIdChanged}
                        label="账号标识"
                      />
                      <Input
                        autoComplete="off"
                        placeholder={
                          ojAccountExternalIdPlaceholders[formValues.platform]
                        }
                        variant="secondary"
                      />
                    </TextField>
                  )}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button
                  isDisabled={isSaving}
                  onPress={closeDialog}
                  variant="secondary"
                >
                  取消
                </Button>
                <Button isPending={isSaving} type="submit">
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

      <AlertDialog.Backdrop
        isOpen={Boolean(deleteTarget)}
        onOpenChange={(isOpen) => {
          if (!(isOpen || deleteAccount.isPending)) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger isDisabled={deleteAccount.isPending} />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger">
                <Trash2 className="size-5" />
              </AlertDialog.Icon>
              <AlertDialog.Heading>删除 OJ 账号？</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <div className="grid gap-3">
                <p>
                  将删除
                  {deleteTarget
                    ? ` ${getOjPlatformConfig(deleteTarget.platform).label} `
                    : " "}
                  的账号记录。删除后可以重新添加。
                </p>
                {deleteMessage ? (
                  <Alert status={deleteMessage.tone}>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>
                        {deleteMessage.text}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
              </div>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={deleteAccount.isPending}
                onPress={() => setDeleteTarget(null)}
                variant="tertiary"
              >
                取消
              </Button>
              <Button
                isPending={deleteAccount.isPending}
                onPress={handleDeleteConfirm}
                variant="danger"
              >
                <Trash2 className="size-4" />
                删除
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
