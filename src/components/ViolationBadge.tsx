"use client";

import { useCallback, useState } from "react";
import Icon from "@/components/Icon";
import { useAppStore } from "@/stores/useAppStore";
import { useDismissable } from "@/hooks/useDismissable";
import type { Violation } from "@/types";

/**
 * エラー・警告の件数バッジ。
 * タップで詳細リストを開き、各項目をタップすると該当箇所へ移動・ハイライトする。
 */
export default function ViolationBadge() {
  const violations = useAppStore((s) => s.violations);
  const focusViolation = useAppStore((s) => s.focusViolation);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const panelRef = useDismissable<HTMLDivElement>(open, close);

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");
  const total = errors.length + warnings.length;

  const pick = (v: Violation) => {
    focusViolation(v);
    close();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          total === 0
            ? "条件チェック: 問題なし"
            : `条件チェック: エラー${errors.length}件、警告${warnings.length}件。詳細を開く`
        }
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
          total === 0
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        {total === 0 ? (
          <>
            <Icon name="check_circle" size={16} />
            問題なし
          </>
        ) : (
          <>
            {errors.length > 0 && (
              <span className="flex items-center gap-1 text-red-700">
                <Icon name="error" size={16} />
                エラー {errors.length}
              </span>
            )}
            {warnings.length > 0 && (
              <span className="flex items-center gap-1 text-amber-700">
                <Icon name="warning" size={16} />
                警告 {warnings.length}
              </span>
            )}
            <Icon name={open ? "expand_less" : "expand_more"} size={16} className="text-slate-400" />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="条件チェックの詳細"
            className="absolute left-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-3rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:left-auto sm:right-0"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">条件チェックの詳細</p>
              <button
                onClick={close}
                aria-label="閉じる"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {total === 0 ? (
              <p className="flex items-center gap-2 py-6 text-center text-sm text-emerald-700">
                <Icon name="check_circle" size={18} />
                すべての条件を満たしています
              </p>
            ) : (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                <p className="text-[11px] text-slate-400">
                  項目をタップすると該当する日・スタッフの場所を表示します
                </p>
                {errors.length > 0 && (
                  <section aria-label={`エラー ${errors.length}件`}>
                    <h3 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-red-700">
                      <Icon name="error" size={14} />
                      エラー（{errors.length}）
                    </h3>
                    <ul className="space-y-1">
                      {errors.map((v) => (
                        <li key={v.id}>
                          <button
                            onClick={() => pick(v)}
                            className="flex w-full items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-left text-xs text-red-800 hover:bg-red-100"
                          >
                            <Icon name="location_on" size={14} className="mt-0.5 shrink-0" />
                            <span>{v.message}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {warnings.length > 0 && (
                  <section aria-label={`警告 ${warnings.length}件`}>
                    <h3 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700">
                      <Icon name="warning" size={14} />
                      警告（{warnings.length}）
                    </h3>
                    <ul className="space-y-1">
                      {warnings.map((v) => (
                        <li key={v.id}>
                          <button
                            onClick={() => pick(v)}
                            className="flex w-full items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-800 hover:bg-amber-100"
                          >
                            <Icon name="location_on" size={14} className="mt-0.5 shrink-0" />
                            <span>{v.message}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
