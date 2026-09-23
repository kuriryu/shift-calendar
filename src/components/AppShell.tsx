"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import SidebarCalendar from "@/components/SidebarCalendar";
import StaffFilter from "@/components/StaffFilter";
import Icon from "@/components/Icon";
import { useAppStore } from "@/stores/useAppStore";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { useMounted } from "@/hooks/useMounted";

const NAV_ITEMS = [
  { href: "/", label: "トップ", icon: "home" },
  { href: "/requests", label: "希望入力", icon: "edit_calendar" },
  { href: "/staff", label: "スタッフ", icon: "group" },
  { href: "/stats", label: "集計", icon: "bar_chart" },
] as const;

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
  const pathname = usePathname();
  const mounted = useMounted();
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const violations = useAppStore((s) => s.violations);
  const recordLogin = useAppStore((s) => s.recordLogin);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // LocalStorage からの復元値とSSR HTMLの不一致（ハイドレーションエラー）を防ぐため、
  // マウント後までは展開状態として描画する
  const collapsed = mounted ? sidebarCollapsed : false;

  return (
    <div className="flex min-h-full flex-1">
      {/* サイドバー（折りたたみ可能） */}
      <aside
        className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        <div
          className={`flex h-14 shrink-0 items-center border-b border-slate-100 ${
            collapsed ? "justify-center" : "justify-between px-4"
          }`}
        >
          {!collapsed && (
            <h1 className="text-sm font-bold text-slate-800">
              シフトカレンダー
            </h1>
          )}
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon
              name={
                collapsed
                  ? "keyboard_double_arrow_right"
                  : "keyboard_double_arrow_left"
              }
              size={18}
            />
          </button>
        </div>

        <nav className="flex shrink-0 flex-col gap-1 p-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-0" : ""
                } ${
                isActive(item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {!collapsed && (
          <div className="flex-1 overflow-y-auto pb-4">
            <div className="border-t border-slate-100 py-3">
              <SidebarCalendar />
            </div>
            <div className="border-t border-slate-100 py-3">
              <StaffFilter />
            </div>
          </div>
        )}
      </aside>

      {/* 右カラム */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
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
    </div>
  );
}
