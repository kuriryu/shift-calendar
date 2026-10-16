"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BoardSync from "@/components/workspace/BoardSync";
import Icon from "@/components/Icon";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { useAppStore } from "@/stores/useAppStore";

const NAV = [
  { href: "/dashboard", label: "ダッシュボード", icon: "dashboard" },
  { href: "/shifts", label: "シフト表", icon: "calendar_view_day" },
  { href: "/reception", label: "シフト希望受付", icon: "inbox" },
  { href: "/business", label: "業態設定", icon: "tune" },
  { href: "/staff", label: "スタッフ", icon: "group" },
];

export default function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const stores = useAppStore((s) => s.stores);
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const closeStore = useAppStore((s) => s.closeStore);
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const activities = useAppStore((s) => s.activities);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const store = stores.find((item) => item.id === activeStoreId);
  const logins = activities.filter((item) => item.kind === "login").slice(0, 8);
  const [year, month] = selectedMonth.split("-").map(Number);

  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    closeStore();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex h-dvh min-h-0 bg-slate-50">
      <BoardSync />
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-4 py-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">MENU</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium ${
                  active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 md:hidden"
            aria-label="メニュー"
            onClick={() => setNavOpen(true)}
          >
            <Icon name="menu" size={22} />
          </button>
          <button
            type="button"
            onClick={() => {
              closeStore();
              router.push("/");
            }}
            className="min-w-0 truncate text-left text-base font-bold text-slate-900"
          >
            {store?.name ?? "店舗"}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="header-year">
              年
            </label>
            <select
              id="header-year"
              value={year}
              onChange={(event) =>
                setMonth(`${event.target.value}-${String(month).padStart(2, "0")}`)
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
            >
              {[year - 1, year, year + 1].map((value) => (
                <option key={value} value={value}>
                  {value}年
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="header-month">
              月
            </label>
            <select
              id="header-month"
              value={month}
              onChange={(event) =>
                setMonth(`${year}-${String(event.target.value).padStart(2, "0")}`)
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}月
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="メニューを開く"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Icon name="more_vert" size={22} />
            </button>
          </div>
          <span className="sr-only">{monthLabel(selectedMonth)}</span>
          <button
            type="button"
            className="sr-only"
            onClick={() => setMonth(shiftMonth(selectedMonth, 1))}
          >
            翌月
          </button>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
            <div
              className="absolute right-4 top-16 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold text-slate-400">ログイン履歴</p>
              <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-sm text-slate-700">
                {logins.length === 0 && <li>履歴はまだありません</li>}
                {logins.map((item) => (
                  <li key={item.id}>
                    {new Date(item.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}
                    {item.message}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void logout()}
                className="mt-4 h-10 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white"
              >
                ログアウト
              </button>
            </div>
          </div>
        )}

        {navOpen && (
          <div className="fixed inset-0 z-40 bg-slate-900/30 md:hidden" onClick={() => setNavOpen(false)}>
            <nav
              className="h-full w-64 bg-white p-4"
              onClick={(event) => event.stopPropagation()}
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-12 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700"
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
