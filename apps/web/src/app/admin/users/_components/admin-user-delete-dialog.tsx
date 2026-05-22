import {
  Alert,
  AlertDialog,
  Button,
  Input,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import { Trash2 } from "lucide-react";

import type { AdminUserTableRow } from "../helpers";

interface AdminUserDeleteDialogProps {
  confirmationValue: string;
  errorMessage: null | string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onConfirmationChange: (value: string) => void;
  user: AdminUserTableRow | null;
}

export function AdminUserDeleteDialog({
  confirmationValue,
  errorMessage,
  isDeleting,
  onCancel,
  onConfirm,
  onConfirmationChange,
  user,
}: AdminUserDeleteDialogProps) {
  const username = user?.username ?? "";
  const isConfirmationMatched = confirmationValue === username;
  const canConfirm = Boolean(user) && isConfirmationMatched && !isDeleting;

  return (
    <AlertDialog.Backdrop
      isOpen={Boolean(user)}
      onOpenChange={(isOpen) => {
        if (!(isOpen || isDeleting)) {
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
            <AlertDialog.Heading>删除用户？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="px-0.5 pt-3 pb-0.5">
            <div className="grid gap-4">
              <p className="text-sm">
                用户一旦删除便无法恢复。请完整输入用户名：
                <span className="font-mono font-semibold">{username}</span>
              </p>
              <TextField
                autoFocus
                fullWidth
                isDisabled={isDeleting}
                name="username-confirmation"
                onChange={onConfirmationChange}
                value={confirmationValue}
              >
                <Label>注册用户名</Label>
                <Input autoComplete="off" variant="secondary" />
              </TextField>
              {errorMessage ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{errorMessage}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
            </div>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              isDisabled={isDeleting}
              onPress={onCancel}
              variant="tertiary"
            >
              取消
            </Button>
            <Button
              isDisabled={!canConfirm}
              isPending={isDeleting}
              onPress={onConfirm}
              variant="danger"
            >
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
