"use client";

import {
  Alert,
  AlertDialog,
  Button,
  Chip,
  Form,
  Input,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextField,
} from "@heroui/react";
import {
  getGradeOptionsWithCurrentValue,
  memberStatuses,
  memberStatusLabels,
  type OjPlatform,
  ojPlatformLabels,
  ojPlatforms,
} from "@hhuacm-dashboard/domain";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, type Key, useEffect, useState } from "react";

import { DirtyFieldLabel } from "@/components/dirty-field-label";
import {
  emptyProfileFormValues,
  type ProfileFieldKey,
  profileFieldConfigs,
} from "@/utils/profile-fields";
import { trpc } from "@/utils/trpc";
import {
  type AdminProfileFormValues,
  type AdminUserDetail,
  type AdminUserOjAccount,
  type AdminUserTableRow,
  buildAdminProfileFormValues,
  getAdminEditErrorMessage,
  getChangedAdminProfileValues,
  getOjAccountByPlatform,
  hasAdminProfileUpdateValues,
  isMemberStatus,
} from "../helpers";

interface AdminUserEditDialogProps {
  listQueryKey: QueryKey;
  onClose: () => void;
  user: AdminUserTableRow | null;
}

interface AdminUserBasicInfoEditorProps {
  detail: AdminUserDetail | undefined;
  isLoading: boolean;
  listQueryKey: QueryKey;
  userId: string;
}

interface AdminUserOjAccountEditorProps {
  accounts: AdminUserOjAccount[];
  isLoading: boolean;
  listQueryKey: QueryKey;
  userId: string;
}

interface AdminUserOjAccountRowProps {
  account: AdminUserOjAccount | undefined;
  isLoading: boolean;
  listQueryKey: QueryKey;
  platform: OjPlatform;
  userId: string;
}

interface AdminUserOjAccountDeleteDialogProps {
  account: AdminUserOjAccount | undefined;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  platform: OjPlatform | null;
}

interface EditorMessage {
  text: string;
  tone: "danger" | "success";
}

function AdminUserBasicInfoEditor({
  detail,
  isLoading,
  listQueryKey,
  userId,
}: AdminUserBasicInfoEditorProps) {
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = useState<AdminProfileFormValues>({
    ...emptyProfileFormValues,
    memberStatus: "selection",
  });
  const [originalFormValues, setOriginalFormValues] =
    useState<AdminProfileFormValues>({
      ...emptyProfileFormValues,
      memberStatus: "selection",
    });
  const [message, setMessage] = useState<EditorMessage | null>(null);

  useEffect(() => {
    const nextValues = buildAdminProfileFormValues(detail?.profile);
    setFormValues(nextValues);
    setOriginalFormValues(nextValues);
    setMessage(null);
  }, [detail?.profile]);

  const changedValues = getChangedAdminProfileValues(
    formValues,
    originalFormValues
  );
  const hasChanges = hasAdminProfileUpdateValues(changedValues);
  const gradeOptions = getGradeOptionsWithCurrentValue(
    originalFormValues.grade
  );
  const updateProfile = useMutation(
    trpc.admin.users.updateProfile.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.admin.users.get.queryKey({ userId }),
          }),
          queryClient.invalidateQueries({ queryKey: listQueryKey }),
        ]);
        setMessage({
          text: "基础信息已保存。",
          tone: "success",
        });
      },
    })
  );

  const handleInputChange = (field: ProfileFieldKey, value: string) => {
    setMessage(null);
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };
  const handleStatusChange = (key: Key | null) => {
    if (!(typeof key === "string" && isMemberStatus(key))) {
      return;
    }

    setMessage(null);
    setFormValues((currentValues) => ({
      ...currentValues,
      memberStatus: key,
    }));
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!hasAdminProfileUpdateValues(changedValues)) {
      setMessage({
        text: "没有需要保存的修改。",
        tone: "success",
      });
      return;
    }

    await updateProfile.mutateAsync({
      userId,
      values: changedValues,
    });
  };

  return (
    <section className="grid gap-4 border-border border-b pb-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-base">基础信息</h3>
        </div>
        {isLoading ? (
          <span className="inline-flex items-center gap-2 text-muted text-sm">
            <Spinner color="current" size="sm" />
            正在读取
          </span>
        ) : null}
      </div>

      {message ? (
        <Alert status={message.tone}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <Form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 px-0.5 pt-3 pb-0.5 sm:grid-cols-2">
          <Select
            fullWidth
            isDisabled={isLoading || updateProfile.isPending}
            onSelectionChange={handleStatusChange}
            selectedKey={formValues.memberStatus}
            variant="secondary"
          >
            <DirtyFieldLabel
              isChanged={"memberStatus" in changedValues}
              label="状态"
            />
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {memberStatuses.map((status) => (
                  <ListBox.Item
                    id={status}
                    key={status}
                    textValue={memberStatusLabels[status]}
                  >
                    {memberStatusLabels[status]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {profileFieldConfigs.map((field) =>
            field.key === "grade" ? (
              <Select
                fullWidth
                isDisabled={isLoading || updateProfile.isPending}
                key={field.key}
                onSelectionChange={(key) =>
                  handleInputChange(
                    field.key,
                    typeof key === "string" ? key : ""
                  )
                }
                placeholder="未填写"
                selectedKey={formValues.grade || null}
                variant="secondary"
              >
                <DirtyFieldLabel
                  isChanged={field.key in changedValues}
                  label={field.label}
                />
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
            ) : (
              <TextField
                fullWidth
                isDisabled={isLoading || updateProfile.isPending}
                key={field.key}
                name={field.key}
                onChange={(nextValue) =>
                  handleInputChange(field.key, nextValue)
                }
                value={formValues[field.key]}
              >
                <DirtyFieldLabel
                  isChanged={field.key in changedValues}
                  label={field.label}
                />
                <Input
                  autoComplete={field.autoComplete}
                  placeholder="未填写"
                  variant="secondary"
                />
              </TextField>
            )
          )}
        </div>
        <div className="flex justify-end">
          <Button
            isDisabled={isLoading || !hasChanges}
            isPending={updateProfile.isPending}
            type="submit"
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Save className="size-4" />
                )}
                {isPending ? "保存中" : "保存基础信息"}
              </>
            )}
          </Button>
        </div>
      </Form>
    </section>
  );
}

function AdminUserOjAccountDeleteDialog({
  account,
  isDeleting,
  onCancel,
  onConfirm,
  platform,
}: AdminUserOjAccountDeleteDialogProps) {
  const platformLabel = platform ? ojPlatformLabels[platform] : "";

  return (
    <AlertDialog.Backdrop
      isOpen={Boolean(platform && account)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel();
        }
      }}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-110">
          <AlertDialog.CloseTrigger isDisabled={isDeleting} />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger">
              <Trash2 className="size-5" />
            </AlertDialog.Icon>
            <AlertDialog.Heading>删除 OJ 账号？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <p className="text-sm">
              将删除 {platformLabel} 账号
              <span className="font-mono font-semibold">
                {account ? ` ${account.handle}` : ""}
              </span>
              。
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={isDeleting}
              onPress={onCancel}
              variant="tertiary"
            >
              取消
            </Button>
            <Button isPending={isDeleting} onPress={onConfirm} variant="danger">
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  {isPending ? "删除中" : "删除"}
                </>
              )}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}

function AdminUserOjAccountRow({
  account,
  isLoading,
  listQueryKey,
  platform,
  userId,
}: AdminUserOjAccountRowProps) {
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState(account?.handle ?? "");
  const [message, setMessage] = useState<EditorMessage | null>(null);
  const [deleteTargetPlatform, setDeleteTargetPlatform] =
    useState<OjPlatform | null>(null);

  useEffect(() => {
    setHandle(account?.handle ?? "");
    setMessage(null);
  }, [account?.handle]);

  const invalidateUserData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.admin.users.get.queryKey({ userId }),
      }),
      queryClient.invalidateQueries({ queryKey: listQueryKey }),
    ]);
  };
  const upsertAccount = useMutation(
    trpc.admin.users.upsertOjAccount.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateUserData();
        setMessage({
          text: account ? "OJ 账号已更新。" : "OJ 账号已添加。",
          tone: "success",
        });
      },
    })
  );
  const deleteAccount = useMutation(
    trpc.admin.users.deleteOjAccount.mutationOptions({
      onError: (error) => {
        setMessage({
          text: getAdminEditErrorMessage(error),
          tone: "danger",
        });
      },
      onSuccess: async () => {
        await invalidateUserData();
        setDeleteTargetPlatform(null);
        setMessage({
          text: "OJ 账号已删除。",
          tone: "success",
        });
      },
    })
  );
  const normalizedHandle = handle.trim();
  const isChanged = normalizedHandle !== (account?.handle ?? "");
  const canSave = Boolean(normalizedHandle) && isChanged;
  const isBusy = upsertAccount.isPending || deleteAccount.isPending;
  const platformLabel = ojPlatformLabels[platform];
  const saveIcon = account ? (
    <Save className="size-4" />
  ) : (
    <Plus className="size-4" />
  );
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!canSave) {
      setMessage({
        text: normalizedHandle ? "没有需要保存的修改。" : "请填写账号昵称。",
        tone: normalizedHandle ? "success" : "danger",
      });
      return;
    }

    await upsertAccount.mutateAsync({
      handle: normalizedHandle,
      platform,
      userId,
    });
  };
  const handleDeleteConfirm = async () => {
    if (!deleteTargetPlatform) {
      return;
    }

    await deleteAccount.mutateAsync({
      platform: deleteTargetPlatform,
      userId,
    });
  };

  return (
    <div className="grid gap-2 rounded-md border border-border px-3 py-3">
      <Form
        className="grid gap-3 md:grid-cols-[7rem_minmax(0,1fr)_auto]"
        onSubmit={handleSubmit}
      >
        <div className="flex min-h-10 items-center">
          <Chip
            color={account ? "success" : "default"}
            size="sm"
            variant="soft"
          >
            {platformLabel}
          </Chip>
        </div>
        <TextField
          fullWidth
          isDisabled={isLoading || isBusy}
          name={`${platform}-handle`}
          onChange={(nextValue) => {
            setMessage(null);
            setHandle(nextValue);
          }}
          value={handle}
        >
          <DirtyFieldLabel isChanged={isChanged} label="账号昵称" />
          <Input autoComplete="off" placeholder="未登记" variant="secondary" />
        </TextField>
        <div className="flex items-end gap-2">
          <Button
            isDisabled={isLoading || !canSave || deleteAccount.isPending}
            isPending={upsertAccount.isPending}
            type="submit"
            variant={account ? "secondary" : undefined}
          >
            {({ isPending }) => (
              <>
                {isPending ? <Spinner color="current" size="sm" /> : saveIcon}
                {account ? "保存" : "添加"}
              </>
            )}
          </Button>
          <Button
            isDisabled={isLoading || !account || upsertAccount.isPending}
            onPress={() => setDeleteTargetPlatform(platform)}
            variant="danger"
          >
            <Trash2 className="size-4" />
            删除
          </Button>
        </div>
      </Form>
      {message ? (
        <Alert status={message.tone}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message.text}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <AdminUserOjAccountDeleteDialog
        account={account}
        isDeleting={deleteAccount.isPending}
        onCancel={() => {
          if (!deleteAccount.isPending) {
            setDeleteTargetPlatform(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        platform={deleteTargetPlatform}
      />
    </div>
  );
}

function AdminUserOjAccountEditor({
  accounts,
  isLoading,
  listQueryKey,
  userId,
}: AdminUserOjAccountEditorProps) {
  return (
    <section className="grid gap-4">
      <div>
        <h3 className="font-semibold text-base">OJ 账号</h3>
      </div>
      <div className="grid gap-3">
        {ojPlatforms.map((platform) => (
          <AdminUserOjAccountRow
            account={getOjAccountByPlatform(accounts, platform)}
            isLoading={isLoading}
            key={platform}
            listQueryKey={listQueryKey}
            platform={platform}
            userId={userId}
          />
        ))}
      </div>
    </section>
  );
}

export function AdminUserEditDialog({
  listQueryKey,
  onClose,
  user,
}: AdminUserEditDialogProps) {
  const userId = user?.id ?? "";
  const detailQuery = useQuery(
    trpc.admin.users.get.queryOptions(
      { userId },
      {
        enabled: Boolean(userId),
        retry: false,
      }
    )
  );
  const detail = detailQuery.data;
  const isOpen = Boolean(user);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(isNextOpen) => {
        if (!isNextOpen) {
          onClose();
        }
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-190">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-default">
              <Pencil className="size-5 text-accent" />
            </Modal.Icon>
            <Modal.Heading>编辑用户</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="grid max-h-[72vh] gap-5 overflow-y-auto px-0.5 pt-3 pb-0.5">
            <div className="grid gap-2 rounded-md border border-border bg-surface px-3 py-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted">注册用户名</span>
                <p className="mt-1 break-all font-mono">
                  {detail?.username ?? user?.username}
                </p>
              </div>
              <div>
                <span className="text-muted">邮箱</span>
                <p className="mt-1 break-all">
                  {detail?.email ?? user?.email ?? "未填写"}
                </p>
              </div>
            </div>

            {detailQuery.isPending ? (
              <Alert>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>正在读取用户信息。</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            {detailQuery.isError ? (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    用户信息加载失败，请刷新列表后重试。
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <AdminUserBasicInfoEditor
              detail={detail}
              isLoading={detailQuery.isPending}
              listQueryKey={listQueryKey}
              userId={userId}
            />
            <AdminUserOjAccountEditor
              accounts={detail?.ojAccounts ?? []}
              isLoading={detailQuery.isPending}
              listQueryKey={listQueryKey}
              userId={userId}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button onPress={onClose} variant="secondary">
              关闭
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
