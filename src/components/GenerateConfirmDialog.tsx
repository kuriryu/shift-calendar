"use client";

import { ControlledActionDialog } from "smarthr-ui";

/** 自動生成の前に出すダイアログ */
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
      <h1 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-slate-900">
        シフト表を自動生成しますか？
      </h1>
      <p className="text-sm leading-relaxed text-slate-700">
        登録したスタッフと希望をもとに、この月のシフトを作り、調整へ進みます。
        {hasExisting && (
          <>
            <br />
            <br />
            いま入っているシフトは、生成した内容に置き換わります。
          </>
        )}
      </p>
    </ControlledActionDialog>
  );
}
