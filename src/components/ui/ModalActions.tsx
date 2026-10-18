import Button, { type ButtonVariant } from "@/components/ui/Button";

export default function ModalActions({
  onCancel,
  cancelLabel = "戻る",
  onConfirm,
  confirmLabel,
  confirmVariant = "primary",
}: {
  onCancel: () => void;
  cancelLabel?: string;
  onConfirm: () => void;
  confirmLabel: string;
  confirmVariant?: Extract<ButtonVariant, "primary" | "dangerFill">;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button type="button" variant="neutral" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="button" variant={confirmVariant} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}
