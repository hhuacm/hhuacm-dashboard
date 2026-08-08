import { Alert, AlertDialog, Button, Spinner } from "@heroui/react";
import { type OjPlatform, ojPlatformLabels } from "@hhuacm-dashboard/domain";
import { Trash2 } from "lucide-react";

interface OjAccountDeleteTarget {
  handle: string;
  platform: OjPlatform;
}

interface OjAccountDeleteDialogProps {
  errorMessage: null | string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  target: null | OjAccountDeleteTarget;
}

export function OjAccountDeleteDialog({
  errorMessage,
  isDeleting,
  onCancel,
  onConfirm,
  target,
}: OjAccountDeleteDialogProps) {
  return (
    <AlertDialog.Backdrop
      isOpen={Boolean(target)}
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
            <AlertDialog.Heading>删除 OJ 账号？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <div className="grid gap-3">
              <p>
                将删除 {target ? ojPlatformLabels[target.platform] : ""} 账号
                <span className="font-mono font-semibold">
                  {target ? ` ${target.handle}` : ""}
                </span>
                。删除后可以重新添加。
              </p>
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
