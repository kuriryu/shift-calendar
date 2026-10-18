"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { Select } from "smarthr-ui";
import BoardSync from "@/components/workspace/BoardSync";
import Button from "@/components/ui/Button";
import ModalActions from "@/components/ui/ModalActions";
import Modal from "@/components/workspace/Modal";
import Icon from "@/components/Icon";
import { monthLabel, shiftMonth } from "@/lib/dates";
import ToastHost from "@/components/ToastHost";
import { useAppStore } from "@/stores/useAppStore";

const NAV = [
  { href: "/dashboard", label: "ダッシュボード", icon: "dashboard" },
  { href: "/shifts", label: "シフト表", icon: "calendar_view_day" },
  { href: "/reception", label: "シフト希望受付", icon: "inbox" },
  { href: "/staff", label: "スタッフ", icon: "group" },
  { href: "/business", label: "業態設定", icon: "tune" },
];

export default function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const stores = useAppStore((s) => s.stores);
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const closeStore = useAppStore((s) => s.closeStore);
  const showHero = useAppStore((s) => s.showHero);
  const selectStore = useAppStore((s) => s.selectStore);
  const deleteActiveStore = useAppStore((s) => s.deleteActiveStore);
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const activities = useAppStore((s) => s.activities);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const logins = activities.filter((item) => item.kind === "login").slice(0, 8);
  const storeName = stores.find((item) => item.id === activeStoreId)?.name ?? "店舗";
  const [year, month] = selectedMonth.split("-").map(Number);

  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
    setConfirmDelete(false);
  }, [pathname]);

  const removeStore = async () => {
    const storeId = activeStoreId;
    if (!storeId) return;
    const nextId = deleteActiveStore();
    setConfirmDelete(false);
    setMenuOpen(false);
    await fetch("/api/board", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId }),
    }).catch(() => undefined);
    if (!nextId) router.push("/");
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    closeStore();
    showHero();
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex h-dvh min-h-0 bg-[var(--ds-canvas)]">
      <ToastHost />
      <BoardSync />
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--ds-line)] bg-white md:flex">
        <div className="px-4 py-5">
          <BrandMark />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-12 items-center gap-2 rounded-xl px-3 text-sm ${
                  active ? "ds-nav-active" : "font-medium text-[var(--ds-body)] hover:bg-[#f7f7f7]"
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
        <header className="flex h-16 shrink-0 items-center gap-0.5 border-b border-[var(--ds-line)] bg-white px-[var(--workspace-gutter-x)] md:gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 md:hidden"
            aria-label="メニュー"
            onClick={() => setNavOpen(true)}
          >
            <Icon name="menu" size={22} />
          </button>
          <div className="header-select-row flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:gap-2">
            <label className="sr-only" htmlFor="header-store">
              店舗
            </label>
            <div className="header-select header-select-store">
              <Select
                id="header-store"
                aria-label="店舗"
                value={activeStoreId ?? ""}
                onChange={(event) => selectStore(event.target.value)}
                options={stores.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>
            <label className="sr-only" htmlFor="header-year">
              年
            </label>
            <div className="header-select header-select-year">
              <Select
                id="header-year"
                aria-label="年"
                value={String(year)}
                onChange={(event) =>
                  setMonth(`${event.target.value}-${String(month).padStart(2, "0")}`)
                }
                options={[year - 1, year, year + 1].map((value) => ({
                  value: String(value),
                  label: `${value}年`,
                }))}
              />
            </div>
            <label className="sr-only" htmlFor="header-month">
              月
            </label>
            <div className="header-select header-select-month">
              <Select
                id="header-month"
                aria-label="月"
                value={String(month)}
                onChange={(event) =>
                  setMonth(`${year}-${String(event.target.value).padStart(2, "0")}`)
                }
                options={Array.from({ length: 12 }, (_, index) => {
                  const value = index + 1;
                  return { value: String(value), label: `${value}月` };
                })}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center">
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
              className="ds-card absolute right-4 top-16 w-72 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
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
              <Button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                variant="danger"
                className="mt-4"
              >
                この店舗を削除
              </Button>
              <Button type="button" onClick={() => void logout()} className="mt-2" fullWidth>
                ログアウト
              </Button>
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
        {confirmDelete && (
          <Modal title="店舗を削除" onClose={() => setConfirmDelete(false)}>
            <p>{storeName}を削除します。この店舗の希望とシフトも消えます。</p>
            <ModalActions
              onCancel={() => setConfirmDelete(false)}
              onConfirm={() => void removeStore()}
              confirmLabel="削除する"
              confirmVariant="dangerFill"
            />
          </Modal>
        )}
      </div>
    </div>
  );
}
