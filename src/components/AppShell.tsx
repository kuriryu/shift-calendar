"use client";

import { useCallback, useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import SidebarCalendar from "@/components/SidebarCalendar";
import StaffFilter from "@/components/StaffFilter";
import SettingsModal from "@/components/SettingsModal";
import Icon from "@/components/Icon";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDismissable } from "@/hooks/useDismissable";

function formatAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ProfileMenu({
  email,
  collapsed,
}: {
  email: string | null;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const panelRef = useDismissable<HTMLDivElement>(open, close);
  const activities = useAppStore((s) => s.activities);
  const clearLoginHistory = useAppStore((s) => s.clearLoginHistory);
  const logins = activities.filter((a) => a.kind === "login").slice(0, 5);
  const edits = activities.filter((a) => a.kind !== "login").slice(0, 8);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-lg text-slate-600 hover:bg-slate-100 ${
          collapsed ? "h-9 w-9 justify-center" : "h-9 px-2"
        }`}
        aria-label="プロフィールと履歴"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <Icon name="account_circle" size={20} />
        </span>
        {!collapsed && (
          <span className="truncate text-xs font-medium">{email ?? "ゲスト"}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="プロフィールと履歴"
            className="absolute bottom-11 left-0 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
          >
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
                    <li key={a.id} className="flex justify-between text-[11px] text-slate-600">
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
                      <span className="shrink-0 text-slate-400">{formatAt(a.at)}</span>
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
            <button
              onClick={close}
              className="mt-2 w-full rounded-md py-1 text-[11px] text-slate-400 hover:bg-slate-50"
            >
              閉じる（Esc）
            </button>
          </div>
        </>
      )}
    </div>
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
  const recordLogin = useAppStore((s) => s.recordLogin);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ログイン履歴を記録（セッション中は1回）
  useEffect(() => {
    if (!email) return;
    if (sessionStorage.getItem("login-recorded")) return;
    sessionStorage.setItem("login-recorded", "1");
    recordLogin(email);
  }, [email, recordLogin]);

  // モバイル（sm 未満）ではサイドバーは既定で折りたたみ、展開時はドロワーとして重ねて表示する
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // LocalStorage からの復元値とSSR HTMLの不一致（ハイドレーションエラー）を防ぐため、
  // マウント後までは展開状態として描画する
  const collapsed = !mounted ? false : isMobile ? !mobileOpen : sidebarCollapsed;
  const drawerOpen = mounted && isMobile && mobileOpen;

  const handleToggle = useCallback(() => {
    if (isMobile) setMobileOpen((o) => !o);
    else toggleSidebar();
  }, [isMobile, toggleSidebar]);

  // モバイルのドロワーは Esc で閉じる
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-full flex-1">
      {/* ドロワー展開時: レイアウトのズレ防止用スペーサー + 背景 */}
      {drawerOpen && (
        <>
          <div className="w-14 shrink-0" aria-hidden />
          <div
            className="fixed inset-0 z-30 bg-slate-900/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        </>
      )}

      {/* サイドバー（折りたたみ可能） */}
      <aside
        aria-label="サイドバー"
        className={`flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] ${
          drawerOpen
            ? "fixed inset-y-0 left-0 z-40 w-72 shadow-2xl"
            : `sticky top-0 z-30 ${collapsed ? "w-14" : "w-64"}`
        }`}
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-slate-100 ${
            collapsed ? "justify-center" : "justify-between px-5"
          }`}
        >
          {!collapsed && (
            <h1 className="text-sm font-bold text-slate-800">シフトカレンダー</h1>
          )}
          <button
            onClick={handleToggle}
            aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
            aria-expanded={!collapsed}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon
              name={collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
              size={18}
            />
          </button>
        </div>

        {!collapsed && (
          <div className="flex-1 overflow-y-auto">
            <section aria-label="カレンダー" className="px-2 py-5">
              <SidebarCalendar />
            </section>
            <section aria-label="スタッフ絞り込み" className="border-t border-slate-100 px-2 py-5">
              <StaffFilter />
            </section>
          </div>
        )}
        {collapsed && <div className="flex-1" />}

        {/* 最下部: プロフィール + 設定 */}
        <div
          className={`flex shrink-0 items-center gap-1 border-t border-slate-100 p-2 ${
            collapsed ? "flex-col" : "justify-between"
          }`}
        >
          <ProfileMenu email={email} collapsed={collapsed} />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="シフト作成の条件設定"
            title="条件設定"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="settings" size={20} />
          </button>
        </div>
      </aside>

      {/* メインエリア */}
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-5 py-8 sm:px-10 sm:py-10">
        {children}
      </main>

      {settingsOpen && (
        <SettingsModal isOpen onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
