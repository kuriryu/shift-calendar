"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import ChatPanel from "@/components/ChatPanel";
import { useAppStore } from "@/stores/useAppStore";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { useMounted } from "@/hooks/useMounted";

const TABS = [
  { href: "/", label: "シフト表" },
  { href: "/requests", label: "希望入力" },
  { href: "/staff", label: "スタッフ" },
  { href: "/stats", label: "集計" },
] as const;

export default function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mounted = useMounted();
  const selectedMonth = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const violations = useAppStore((s) => s.violations);

  const errorCount = violations.filter((v) => v.severity === "error").length;
  const warningCount = violations.filter(
    (v) => v.severity === "warning",
  ).length;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <h1 className="text-base font-bold text-slate-800">
            シフトカレンダー
          </h1>

          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive(t.href)
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(shiftMonth(selectedMonth, -1))}
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
              aria-label="前の月"
            >
              ‹
            </button>
            <span className="min-w-24 text-center text-sm font-semibold text-slate-800">
              {mounted ? monthLabel(selectedMonth) : "…"}
            </span>
            <button
              onClick={() => setMonth(shiftMonth(selectedMonth, 1))}
              className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
              aria-label="次の月"
            >
              ›
            </button>
          </div>

          {mounted && (errorCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-2 text-xs font-medium">
              {errorCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                  エラー {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  警告 {warningCount}
                </span>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline">
              {email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>

      <ChatPanel />
    </div>
  );
}
