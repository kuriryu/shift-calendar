"use client";

import { useState } from "react";
import { ControlledActionDialog } from "smarthr-ui";
import NoticeCard, { NoticeIcon } from "@/components/NoticeCard";

/** 希望入力へ戻る案内。確認してから移動する */
export default function ChangeRequestNotice({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NoticeCard
        label="シフト変更願が起きたら"
        className="flex flex-wrap items-center justify-between gap-3 py-3.5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <NoticeIcon name="edit_calendar" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">シフト変更願が起きたら</p>
            <p className="mt-0.5 text-xs text-slate-500">
              希望を直すために、希望入力へ戻れます。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 min-h-11 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          希望入力へ戻る
        </button>
      </NoticeCard>

      <ControlledActionDialog
        isOpen={open}
        heading="希望入力へ戻りますか？"
        actionButton={{ text: "はい", theme: "primary" }}
        onClickAction={() => {
          setOpen(false);
          onConfirm();
        }}
        onClickClose={() => setOpen(false)}
        onClickOverlay={() => setOpen(false)}
        width={480}
        className="change-request-dialog"
      >
        <h1 className="mb-5 text-2xl font-bold leading-tight tracking-tight text-slate-900">
          希望入力へ戻りますか？
        </h1>
        <p className="text-sm leading-relaxed text-slate-700">
          シフト変更願が起きたときは、ステップ4の希望入力に戻って、休みや出勤の希望を直してください。いま作ってあるシフトはそのまま残ります。希望を直したあとは、自動生成から作り直せます。
        </p>
      </ControlledActionDialog>
    </>
  );
}
