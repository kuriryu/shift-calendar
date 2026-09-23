"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { useAppStore } from "@/stores/useAppStore";

/** 全○ / 全休 / 並び替えをモーダルで選択 */
export default function StaffBulkMenu({
  staffId,
  staffName,
}: {
  staffId: string;
  staffName: string;
}) {
  const bulkSetRequests = useAppStore((s) => s.bulkSetRequests);
  const sortStaffByName = useAppStore((s) => s.sortStaffByName);
  const sortStaffByRole = useAppStore((s) => s.sortStaffByRole);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${staffName}の一括操作`}
        aria-haspopup="dialog"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
      >
        <Icon name="more_horiz" size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`bulk-title-${staffId}`}
            className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id={`bulk-title-${staffId}`}
              className="text-base font-bold text-slate-900"
            >
              {staffName}
            </h3>
            <p className="mt-1 text-xs text-slate-500">希望の一括設定と並び替え</p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-left text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100 transition-colors hover:bg-emerald-100"
                onClick={() => {
                  bulkSetRequests(staffId, "available");
                  close();
                }}
              >
                <Icon name="check_circle" size={20} className="text-emerald-600" />
                全日○（出勤可能）
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-200"
                onClick={() => {
                  bulkSetRequests(staffId, "off");
                  close();
                }}
              >
                <Icon name="event_busy" size={20} className="text-slate-500" />
                全日休
              </button>
            </div>

            <p className="mt-5 text-[11px] font-semibold tracking-wide text-slate-400">
              スタッフの並び順
            </p>
            <div className="mt-2 space-y-2">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  sortStaffByName();
                  close();
                }}
              >
                <Icon name="sort_by_alpha" size={18} className="text-slate-500" />
                名前順に並べ替え
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  sortStaffByRole();
                  close();
                }}
              >
                <Icon name="category" size={18} className="text-slate-500" />
                属性順に並べ替え
              </button>
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-4 w-full rounded-lg py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
