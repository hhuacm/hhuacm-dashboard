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

interface ProblemSetDeleteDialogProps {
  confirmationValue: string;
  errorMessage: null | string;
  isDeleting: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onConfirmationChange: (value: string) => void;
  title: string;
}

export function ProblemSetDeleteDialog({
  confirmationValue,
  errorMessage,
  isDeleting,
  isOpen,
  onCancel,
  onConfirm,
  onConfirmationChange,
  title,
}: ProblemSetDeleteDialogProps) {
  const isConfirmationMatched = confirmationValue === title;
  const canConfirm = isConfirmationMatched && !isDeleting;

  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={(nextIsOpen) => {
        if (!(nextIsOpen || isDeleting)) {
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
            <AlertDialog.Heading>删除题单？</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="px-0.5 pt-3 pb-0.5">
            <div className="grid gap-4">
              <p className="text-sm">
                题单一旦删除便无法恢复。请完整输入题单名称：
                <span className="font-semibold">{title}</span>
              </p>
              <TextField
                autoFocus
                fullWidth
                isDisabled={isDeleting}
                name="problem-set-title-confirmation"
                onChange={onConfirmationChange}
                value={confirmationValue}
              >
                <Label>题单名称</Label>
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
              className="border-danger/20 bg-danger-soft/45 text-danger hover:bg-danger-soft/65"
              isDisabled={!canConfirm}
              isPending={isDeleting}
              onPress={onConfirm}
              variant="outline"
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
