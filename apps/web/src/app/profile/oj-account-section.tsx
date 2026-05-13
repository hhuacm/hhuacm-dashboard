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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { type FormEvent, type Key, useMemo, useState } from "react";
import { trpc } from "@/utils/trpc";

const ojPlatformConfigs = [
  {
    iconSrc: "/oj-icons/luogu.png",
    key: "luogu",
    label: "洛谷",
    name: "Luogu",
  },
  {
    iconSrc: "/oj-icons/codeforces.svg",
    key: "codeforces",
    label: "Codeforces",
    name: "Codeforces",
  },
  {
    iconSrc: "/oj-icons/atcoder.png",
    key: "atcoder",
    label: "AtCoder",
    name: "AtCoder",
  },
  {
    iconSrc: "/oj-icons/nowcoder.png",
    key: "nowcoder",
    label: "牛客",
    name: "Nowcoder",
  },
] as const;

type OjPlatform = (typeof ojPlatformConfigs)[number]["key"];

interface OjAccount {
  handle: string;
  platform: OjPlatform;
}

interface OjAccountSectionProps {
  username: null | string | undefined;
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

const getPlatformConfig = (platform: OjPlatform) =>
  ojPlatformConfigs.find((config) => config.key === platform);

const isOjPlatform = (value: string): value is OjPlatform =>
  ojPlatformConfigs.some((config) => config.key === value);

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

  if (errorText.includes("OJ handle already exists")) {
    return "该平台账号已被其他用户登记。";
  }

  if (errorText.includes("OJ account does not exist")) {
    return "该平台尚未登记。";
  }

  if (errorText.includes("User does not exist")) {
    return "当前用户不存在，请重新登录后再试。";
  }

  return "操作失败，请稍后再试。";
};

export function OjAccountSection({ username }: OjAccountSectionProps) {
  const queryClient = useQueryClient();
  const queryInput = { username: username ?? "" };
  const queryKey = trpc.ojAccount.listByUsername.queryKey(queryInput);
  const [dialog, setDialog] = useState<AccountDialog | null>(null);
  const [formPlatform, setFormPlatform] = useState<OjPlatform>("luogu");
  const [formHandle, setFormHandle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OjAccount | null>(null);
  const [message, setMessage] = useState<OjAccountMessage | null>(null);
  const [dialogMessage, setDialogMessage] = useState<OjAccountMessage | null>(
    null
  );
  const [deleteMessage, setDeleteMessage] = useState<OjAccountMessage | null>(
    null
  );

  const accountQuery = useQuery(
    trpc.ojAccount.listByUsername.queryOptions(queryInput, {
      enabled: Boolean(username),
    })
  );

  const accountsByPlatform = useMemo(() => {
    const nextAccounts = new Map<OjPlatform, OjAccount>();

    for (const account of accountQuery.data?.accounts ?? []) {
      nextAccounts.set(account.platform, account);
    }

    return nextAccounts;
  }, [accountQuery.data?.accounts]);

  const availablePlatforms = ojPlatformConfigs.filter(
    (config) => !accountsByPlatform.has(config.key)
  );
  const hasAvailablePlatform = availablePlatforms.length > 0;
  const canAddAccount = Boolean(username && hasAvailablePlatform);

  const invalidateAccounts = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const addAccount = useMutation(
    trpc.ojAccount.add.mutationOptions({
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
    trpc.ojAccount.update.mutationOptions({
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
    trpc.ojAccount.delete.mutationOptions({
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
  const dialogPlatformConfig = getPlatformConfig(formPlatform);

  const openAddDialog = (platform?: OjPlatform) => {
    const nextPlatform = platform ?? availablePlatforms[0]?.key;

    if (!nextPlatform) {
      return;
    }

    setDialog({ mode: "add" });
    setFormPlatform(nextPlatform);
    setFormHandle("");
    setMessage(null);
    setDialogMessage(null);
  };

  const openEditDialog = (account: OjAccount) => {
    setDialog({ mode: "edit", platform: account.platform });
    setFormPlatform(account.platform);
    setFormHandle(account.handle);
    setMessage(null);
    setDialogMessage(null);
  };

  const closeDialog = () => {
    if (isSaving) {
      return;
    }

    setDialog(null);
  };

  const handlePlatformSelectionChange = (key: Key | null) => {
    if (typeof key !== "string" || !isOjPlatform(key)) {
      return;
    }

    setFormPlatform(key);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const handle = formHandle.trim();

    if (!handle) {
      setDialogMessage({
        text: "请填写 OJ 账号昵称。",
        tone: "danger",
      });
      return;
    }

    if (!dialog) {
      return;
    }

    setMessage(null);
    setDialogMessage(null);

    if (dialog.mode === "add") {
      addAccount.mutate({ handle, platform: formPlatform });
      return;
    }

    updateAccount.mutate({ handle, platform: dialog.platform });
  };

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
          {username ? null : (
            <Alert>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  当前账号缺少用户名，暂时不能维护 OJ 账号。
                </Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          {accountQuery.isPending && username ? (
            <Alert>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>正在读取 OJ 账号。</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {accountQuery.isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>
                  {getOjAccountErrorMessage(accountQuery.error)}
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
                      {account ? (
                        <span className="max-w-full break-all font-medium text-foreground">
                          {account.handle}
                        </span>
                      ) : null}
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
                          isDisabled={!username || isBusy}
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
                <Modal.Icon className="bg-default text-accent">
                  <Code2 className="size-5" />
                </Modal.Icon>
                <Modal.Heading>
                  {dialog?.mode === "edit" ? "编辑 OJ 账号" : "添加 OJ 账号"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4 px-0.5 pb-0.5">
                {dialog?.mode === "add" ? (
                  <Select
                    fullWidth
                    isDisabled={isSaving}
                    onSelectionChange={handlePlatformSelectionChange}
                    placeholder="选择平台"
                    selectedKey={formPlatform}
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
                ) : (
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-muted text-sm">平台</p>
                    <p className="mt-1 font-medium text-foreground">
                      {dialogPlatformConfig?.label ?? formPlatform}
                    </p>
                  </div>
                )}

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

                <TextField
                  fullWidth
                  isDisabled={isSaving}
                  name="handle"
                  onChange={setFormHandle}
                  value={formHandle}
                >
                  <Label>账号昵称</Label>
                  <Input
                    autoComplete="off"
                    placeholder="填写该平台的账号昵称"
                    variant="secondary"
                  />
                </TextField>
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
                    ? ` ${getPlatformConfig(deleteTarget.platform)?.label ?? deleteTarget.platform} `
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
