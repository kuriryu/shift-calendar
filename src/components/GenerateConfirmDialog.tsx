"use client";

import { ControlledActionDialog } from "smarthr-ui";

/** 自動生成の確認ダイアログ（ステップ4・再生成で共用） */
export default function GenerateConfirmDialog({
  isOpen,
  hasExisting,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  /** 既に確定済みシフトがある月か */
  hasExisting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ControlledActionDialog
      isOpen={isOpen}
      heading="シフト表を自動生成しますか？"
      actionButton={{ text: "生成する", theme: "primary" }}
      onClickAction={() => {
        onConfirm();
        onClose();
      }}
      onClickClose={onClose}
      onClickOverlay={onClose}
      width={480}
      className="generate-confirm-dialog"
    >
      <p className="text-sm leading-relaxed text-slate-700">
        登録したスタッフと希望をもとに、この月のシフト案を作ります。確定するまで既存のシフトは変わりません。
        {hasExisting && (
          <>
            <br />
            <br />
            いま入っているシフトは、確定するまでそのままで、案だけ作り直します。
          </>
        )}
      </p>
    </ControlledActionDialog>
  );
}
