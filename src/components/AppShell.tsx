"use client";

import { useCallback, useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import SidebarCalendar from "@/components/SidebarCalendar";
import StaffFilter from "@/components/StaffFilter";
import Icon from "@/components/Icon";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDismissable } from "@/hooks/useDismissable";
import BrandMark from "@/components/BrandMark";

function formatAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ProfileMenu({
  email,
  collapsed,
  align = "left",
}: {
  email: string | null;
  collapsed: boolean;
  /** ヘッダー右端など、パネルを右寄せしたいとき */
  align?: "left" | "right";
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
        className={`inline-flex min-h-11 items-center gap-2 rounded-md text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
          collapsed ? "h-11 w-11 justify-center" : "h-11 px-2"
        }`}
        aria-label="プロフィールと履歴"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Icon name="account_circle" size={20} />
        </span>
        {!collapsed && (
          <span className="truncate text-xs font-medium">{email ?? "ゲスト"}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={close} aria-hidden />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="プロフィールと履歴"
            className={`absolute z-[70] w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-4 shadow-xl ${
              align === "right"
                ? "right-0 top-11"
                : "bottom-11 left-0"
            }`}
          >
            <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Icon name="account_circle" size={26} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-normal leading-5 text-slate-700">
                  {email ?? "ゲスト"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {email ? "ログイン中" : "未ログイン"}
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

            {email ? (
              <div className="border-t border-slate-100 pt-3">
                <SignOutButton />
              </div>
            ) : null}
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
  const [authenticated, setAuthenticated] = useState(!!email);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => {
        if (!cancelled) setAuthenticated(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (sessionStorage.getItem("login-recorded")) return;
    sessionStorage.setItem("login-recorded", "1");
    recordLogin("ログイン");
  }, [authenticated, recordLogin]);

  // モバイル（sm 未満）ではサイドバーは既定で折りたたみ、展開時はドロワーとして重ねて表示する
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // LocalStorage からの復元値とSSR HTMLの不一致（ハイドレーションエラー）を防ぐため、
  // マウント後までは展開状態として描画する
  const collapsed = !mounted ? false : isMobile ? !mobileOpen : sidebarCollapsed;
  const drawerOpen = mounted && isMobile && mobileOpen;
  const createStarted = useAppStore((s) => s.createStarted);
  const showHero = useAppStore((s) => s.showHero);

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

  // ヒーロー表示中（およびマウント前）はシェルを出さず全画面で children のみ
  if (!mounted || !createStarted) {
    return <div className="flex min-h-dvh flex-1 flex-col">{children}</div>;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-1 flex-col overflow-hidden md:h-auto md:min-h-full md:overflow-visible md:flex-row">
      {isMobile && (
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-2">
          <button
            onClick={handleToggle}
            aria-label={mobileOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
            className="inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Icon name={mobileOpen ? "close" : "menu"} size={22} />
          </button>
          <ProfileMenu email={authenticated ? "ログイン中" : null} collapsed align="right" />
        </header>
      )}

      {drawerOpen && (
        <div
          className="fixed inset-0 z-[200] bg-slate-900/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="サイドバー"
        className={`flex shrink-0 flex-col overflow-hidden border-r border-slate-300 bg-slate-50 transition-[width] ${
          drawerOpen
            ? "fixed inset-y-0 left-0 z-[210] h-dvh max-h-dvh w-[min(280px,88vw)] shadow-2xl"
            : `sticky top-0 z-30 h-[calc(100dvh-3.5rem)] md:h-screen ${isMobile ? "hidden" : collapsed ? "w-14" : "w-[280px]"}`
        }`}
      >
        {/* 上部: ロゴ（展開時）＋折りたたみボタン */}
        {!isMobile && (
          <div
            className={`flex h-16 shrink-0 items-center ${
              collapsed ? "justify-center px-0" : "justify-between px-4"
            }`}
          >
            {!collapsed && (
              <button
                type="button"
                onClick={showHero}
                className="min-w-0 text-left"
                aria-label="Shift Kit ヒーロー画面へ"
              >
                <BrandMark size="md" />
              </button>
            )}            <button
              onClick={handleToggle}
              aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
              aria-expanded={!collapsed}
              className="inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
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
        )}

        {isMobile && !collapsed && (
          <div className="flex h-12 shrink-0 items-center border-b border-slate-200 bg-white px-4">
            <button
              type="button"
              onClick={showHero}
              className="min-w-0 text-left"
              aria-label="Shift Kit ヒーロー画面へ"
            >
              <BrandMark size="md" />
            </button>
          </div>
        )}

        {!collapsed ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section
              aria-label="カレンダー"
              className={isMobile ? "px-3 py-3" : "p-4"}
            >
              <SidebarCalendar />
            </section>
            <section
              aria-label="スタッフ絞り込み"
              className={isMobile ? "px-3 py-3" : "p-4"}
            >
              <StaffFilter />
            </section>
          </div>
        ) : (
          <div className="min-h-0 flex-1" />
        )}

        <div
          className={`flex shrink-0 items-center ${
            isMobile ? "p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" : "p-2"
          }`}
        >
          <ProfileMenu email={authenticated ? "ログイン中" : null} collapsed={collapsed} />
        </div>
      </aside>

      {/* メインエリア: モバイルは 100dvh 内に収めてページスクロールを避ける */}
      <main className="mx-auto flex w-full min-h-0 min-w-0 max-w-7xl flex-1 flex-col overflow-hidden bg-white px-6 py-3 md:overflow-visible md:px-10 md:py-6">
        {children}
      </main>

    </div>
  );
}
