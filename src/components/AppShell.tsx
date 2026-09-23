"use client";

import { useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import Icon from "@/components/Icon";
import { useAppStore } from "@/stores/useAppStore";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { useMounted } from "@/hooks/useMounted";

function formatAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ProfileMenu({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const activities = useAppStore((s) => s.activities);
  const clearLoginHistory = useAppStore((s) => s.clearLoginHistory);
  const logins = activities.filter((a) => a.kind === "login").slice(0, 5);
  const edits = activities.filter((a) => a.kind !== "login").slice(0, 8);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
        aria-label="プロフィール"
      >
        <Icon name="account_circle" size={22} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Icon name="account_circle" size={26} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {email ?? "ゲスト"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {email ? "ログイン中" : "ゲストモード（認証オフ）"}
                </p>
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <Icon name="login" size={13} />
                  ログイン履歴
                </p>
                {logins.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("ログイン履歴をすべて削除しますか？")) {
                        clearLoginHistory();
                      }
                    }}
                    className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label="ログイン履歴をすべて削除"
                  >
                    <Icon name="delete" size={12} />
                    すべて削除
                  </button>
                )}
              </div>
              {logins.length === 0 ? (
                <p className="text-[11px] text-slate-400">記録なし</p>
              ) : (
                <ul className="space-y-1">
                  {logins.map((a) => (
                    <li
                      key={a.id}
                      className="flex justify-between text-[11px] text-slate-600"
                    >
                      <span>{a.message}</span>
                      <span className="text-slate-400">{formatAt(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-3">
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Icon name="history" size={13} />
                編集履歴
              </p>
              {edits.length === 0 ? (
                <p className="text-[11px] text-slate-400">記録なし</p>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {edits.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-2 text-[11px] text-slate-600"
                    >
                      <span className="min-w-0 flex-1 truncate" title={a.message}>
                        {a.message}
                      </span>
                      <span className="shrink-0 text-slate-400">
                        {formatAt(a.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {email && (
              <div className="border-t border-slate-100 pt-3">
                <SignOutButton />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function AppShell({
  email,
  children,
}: {
  email: string | null;
  children: React.ReactNode;
}) {
  const mounted = useMounted();
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const violations = useAppStore((s) => s.violations);
  const recordLogin = useAppStore((s) => s.recordLogin);

  // ログイン履歴を記録（セッション中は1回）
  useEffect(() => {
    if (!email) return;
    if (sessionStorage.getItem("login-recorded")) return;
    sessionStorage.setItem("login-recorded", "1");
    recordLogin(email);
  }, [email, recordLogin]);

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter(
    (v) => v.severity === "warning",
  ).length;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <h1 className="text-base font-bold text-slate-800">
            シフトカレンダー
          </h1>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(shiftMonth(selectedMonth, -1))}
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
              aria-label="前の月"
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <span className="min-w-24 text-center text-sm font-semibold text-slate-800">
              {mounted ? monthLabel(selectedMonth) : "…"}
            </span>
            <button
              onClick={() => setMonth(shiftMonth(selectedMonth, 1))}
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
              aria-label="次の月"
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>

          {mounted && (errorCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-2 text-xs font-medium">
              {errorCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                  <Icon name="error" size={12} />
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  <Icon name="warning" size={12} />
                  {warningCount}
                </span>
              )}
            </div>
          )}

          <div className="relative ml-auto">
            <ProfileMenu email={email} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
