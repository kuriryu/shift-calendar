"use client";

import Link from "next/link";
import { useAppStore, EMPTY_ASSIGNMENTS } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { daysOfMonth, dayLabel, monthLabel } from "@/lib/dates";
import Icon from "@/components/Icon";
import ShiftBoard from "@/components/ShiftBoard";

const QUICK_ACTIONS = [
  {
    href: "/requests",
    icon: "edit_calendar",
    title: "希望入力",
    desc: "希望休の入力と自動生成",
    cls: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/staff",
    icon: "group",
    title: "スタッフ",
    desc: "属性・基本パターン・要望の編集",
    cls: "bg-amber-50 text-amber-600",
  },
  {
    href: "/stats",
    icon: "bar_chart",
    title: "集計",
    desc: "月間時間・週ごとの稼働",
    cls: "bg-sky-50 text-sky-600",
  },
] as const;

export default function Dashboard() {
  const mounted = useMounted();
  const month = useAppStore((s) => s.selectedMonth);
  const staff = useAppStore((s) => s.staff);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const violations = useAppStore((s) => s.violations);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  const days = daysOfMonth(month);
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");
  const perDay = new Map<string, number>();
  for (const a of assignments) {
    perDay.set(a.date, (perDay.get(a.date) ?? 0) + 1);
  }
  const maxPerDay = Math.max(1, ...perDay.values());
  const shownViolations = [...errors, ...warnings].slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">トップ</h2>
        <p className="text-xs text-slate-400">{monthLabel(month)} の状況</p>
      </div>

      {/* サマリカード */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="event_available" size={14} />
            今月の割当
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {assignments.length}
            <span className="ml-1 text-xs font-normal text-slate-400">件</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="error" size={14} className="text-red-500" />
            エラー
          </div>
          <p
            className={`mt-1 text-2xl font-bold ${errors.length > 0 ? "text-red-600" : "text-slate-800"}`}
          >
            {errors.length}
            <span className="ml-1 text-xs font-normal text-slate-400">件</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="warning" size={14} className="text-amber-500" />
            警告
          </div>
          <p
            className={`mt-1 text-2xl font-bold ${warnings.length > 0 ? "text-amber-600" : "text-slate-800"}`}
          >
            {warnings.length}
            <span className="ml-1 text-xs font-normal text-slate-400">件</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="group" size={14} />
            スタッフ
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-800">
            {staff.length}
            <span className="ml-1 text-xs font-normal text-slate-400">名</span>
          </p>
        </div>
      </div>

      {/* シフト表 */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Icon name="calendar_month" size={16} />
          シフト表
        </h3>
        <ShiftBoard />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 違反リスト */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Icon name="report" size={16} />
            違反・警告
          </h3>
          {assignments.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              シフトが未生成です。「希望入力」から自動生成してください。
            </p>
          ) : shownViolations.length === 0 ? (
            <p className="flex items-center justify-center gap-1.5 py-6 text-xs text-emerald-600">
              <Icon name="check_circle" size={16} />
              違反はありません
            </p>
          ) : (
            <ul className="space-y-1.5">
              {shownViolations.map((v) => (
                <li
                  key={v.id}
                  className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                    v.severity === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <Icon
                    name={v.severity === "error" ? "error" : "warning"}
                    size={14}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{v.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 日別出勤数 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Icon name="bar_chart" size={16} />
            日別の出勤者数
          </h3>
          {assignments.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">—</p>
          ) : (
            <div className="flex h-28 items-end gap-[2px]">
              {days.map((d) => {
                const n = perDay.get(d) ?? 0;
                return (
                  <div
                    key={d}
                    className="group relative flex-1 rounded-t bg-indigo-200 hover:bg-indigo-400"
                    style={{ height: `${(n / maxPerDay) * 100}%` }}
                    title={`${dayLabel(d)}: ${n}名`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${a.cls}`}
            >
              <Icon name={a.icon} size={20} />
            </span>
            <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-slate-700">
              {a.title}
              <Icon
                name="arrow_forward"
                size={14}
                className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500"
              />
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
