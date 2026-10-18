"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ModalActions from "@/components/ui/ModalActions";
import Modal from "@/components/workspace/Modal";
import { EMPTY_ASSIGNMENTS, useAppStore } from "@/stores/useAppStore";
import { toast } from "@/stores/useToastStore";

export default function GenerateShiftButton({
  disabled,
  onGenerated,
  className,
  fullWidth,
}: {
  disabled?: boolean;
  onGenerated: () => void;
  className?: string;
  fullWidth?: boolean;
}) {
  const month = useAppStore((s) => s.selectedMonth);
  const assignments = useAppStore((s) => s.assignments[month] ?? EMPTY_ASSIGNMENTS);
  const generate = useAppStore((s) => s.generate);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isRegenerate = assignments.length > 0;

  const runGenerate = (regenerating: boolean) => {
    generate();
    toast(regenerating ? "シフトを再生成しました" : "シフトを生成しました");
    onGenerated();
  };

  const handleClick = () => {
    if (isRegenerate) {
      setConfirmOpen(true);
      return;
    }
    runGenerate(false);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    runGenerate(true);
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        fullWidth={fullWidth}
        className={className}
      >
        {isRegenerate ? "シフトを再生成" : "シフトを生成"}
      </Button>
      {confirmOpen && (
        <Modal
          title="本当によろしいですか？"
          onClose={() => setConfirmOpen(false)}
          footer={
            <ModalActions
              onCancel={() => setConfirmOpen(false)}
              onConfirm={handleConfirm}
              confirmLabel="再生成する"
            />
          }
        >
          いまのシフトは上書きされます。
        </Modal>
      )}
    </>
  );
}
