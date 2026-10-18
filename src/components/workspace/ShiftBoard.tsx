"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DayTimeline from "@/components/DayTimeline";
import Icon from "@/components/Icon";
import HoursCompareBar from "@/components/workspace/HoursCompareBar";
import Modal from "@/components/workspace/Modal";
import { hopeChip } from "@/components/DayRequestList";
import { navCircleButtonClassName } from "@/components/FieldControl";
import {
  dayLabel,
  daysOfMonth,
  formatDate,
  monthLabel,
  parseDate,
  weekDatesAround,
  weekKeyOf,
  weekdayLabel,
  weeksOfMonth,
} from "@/lib/dates";
import { businessRange, requestedMinutesOf, assignedMinutesOf } from "@/lib/hope-hours";
import { drawShiftJpeg, downloadJpeg, downloadPdf } from "@/lib/print-shift";
import { sharePageUrl } from "@/lib/public-url";
import { staffLabel } from "@/lib/store-book";
import { minutesToJapaneseHours, workMinutesOf } from "@/lib/time";
import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";

export default function ShiftBoard() {
  const router = useRouter();
  const month = useAppStore((s) => s.selectedMonth);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const staff = useAppStore((s) => s.staff);
  const settings = useAppStore((s) => s.settings);
  const requests = useAppStore((s) => s.requests[month] ?? EMPTY_REQUESTS);
  const assignments = useAppStore((s) => s.assignments[month] ?? EMPTY_ASSIGNMENTS);
  const violations = useAppStore((s) => s.violations);
  const setIssueOpen = useAppStore((s) => s.setIssueOpen);
  const generate = useAppStore((s) => s.generate);
  const focusViolation = useAppStore((s) => s.focusViolation);
  const published = useAppStore((s) => s.publishedMonths.includes(month));
  const publishMonth = useAppStore((s) => s.publishMonth);
  const reopenMonth = useAppStore((s) => s.reopenMonth);
  const storeName = useAppStore(
    (s) => s.stores.find((store) => store.id === s.activeStoreId)?.name ?? "店舗",
  );
  const storeId = useAppStore((s) => s.activeStoreId);
  const [modal, setModal] = useState<"warn" | "ok" | null>(null);
  const date = selectedDate.startsWith(month) ? selectedDate : `${month}-01`;
  const days = daysOfMonth(month);
  const weekDays = useMemo(() => {
    const inMonth = weekDatesAround(date).filter((d) => d.startsWith(month));
    if (inMonth.length > 0) return inMonth;
    return date.startsWith(month) ? [date] : [];
  }, [date, month]);
  const weeks = useMemo(() => weeksOfMonth(month), [month]);
  const weekIndex = weeks.findIndex((w) => w.key === weekKeyOf(date));
  const canPrevWeek = weekIndex > 0;
  const canNextWeek = weekIndex >= 0 && weekIndex < weeks.length - 1;

  const goWeek = (delta: number) => {
    const d = parseDate(date);
    d.setDate(d.getDate() + delta * 7);
    const first = days[0];
    const last = days[days.length - 1];
    let next = formatDate(d);
    if (next < first) next = first;
    if (next > last) next = last;
    setSelectedDate(next);
  };
  const errors = violations.filter((item) => item.severity === "error");
  const warnings = violations.filter((item) => item.severity === "warning");
  const dayRequests = requests.filter((request) => request.date === date);
  const dayAssignments = assignments.filter((assignment) => assignment.date === date);
  const dayMinutes = dayAssignments.reduce((total, assignment) => total + workMinutesOf(assignment), 0);
  const hours = businessRange(date, settings);

  const achievement = useMemo(
    () =>
      staff.map((member) => ({
        id: member.id,
        name: staffLabel(member),
        requested: requestedMinutesOf(member, requests, settings),
        assigned: assignedMinutesOf(member.id, assignments),
        minimum: (member.minHours ?? 0) * 60,
      })),
    [assignments, requests, settings, staff],
  );

  const generateShift = () => {
    generate();
    setIssueOpen(true);
    if (!selectedDate.startsWith(month)) setSelectedDate(`${month}-01`);
  };

  const complete = () => {
    if (errors.length > 0) return;
    setModal(warnings.length > 0 ? "warn" : "ok");
  };

  const finish = () => {
    setModal(null);
    publishMonth();
  };

  const exportFile = async (kind: "jpeg" | "pdf") => {
    const canvas = drawShiftJpeg({
      storeName,
      month,
      monthLabel: monthLabel(month),
      staff,
      assignments,
    });
    const filename = `${storeName}-${month}-shift`;
    if (kind === "jpeg") await downloadJpeg(canvas, `${filename}.jpg`);
    else await downloadPdf(canvas, `${filename}.pdf`);
  };

  const share = async () => {
    const path = storeId ? sharePageUrl(storeId, month) : location.href;
    const text = `${storeName}の${monthLabel(month)}シフトです。\n${path}`;
    if (navigator.share) {
      await navigator.share({ title: `${storeName}のシフト`, text, url: path }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(text);
    globalThis.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex h-full min-h-0">
      {!published && assignments.length > 0 && (
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-sm font-bold text-slate-900">生成メモ</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              修正が必要な内容が消えると完了できます。
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto px-4 pb-4 pt-2">
            {errors.length === 0 && warnings.length === 0 && (
              <p className="text-sm text-slate-400">修正も警告もありません</p>
            )}
            {errors.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => focusViolation(item)}
                className="block w-full rounded-xl bg-red-50 px-3 py-3 text-left text-sm text-red-800"
              >
                修正: {item.message}
              </button>
            ))}
            {warnings.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => focusViolation(item)}
                className="block w-full rounded-xl bg-amber-50 px-3 py-3 text-left text-sm text-amber-800"
              >
                警告: {item.message}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              disabled={errors.length > 0 || assignments.length === 0}
              onClick={complete}
              className="ds-btn w-full disabled:opacity-40"
            >
              完了
            </button>
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="ds-title">シフト表</h1>
            <p className="text-sm text-slate-500">{monthLabel(month)}</p>
          </div>
          {!published && (
            <button
              type="button"
              onClick={generateShift}
              disabled={staff.length === 0}
              className="ds-btn disabled:opacity-40"
            >
              シフトを生成
            </button>
          )}
        </div>

        {published ? (
          <section className="ds-card mt-6 p-6">
            <h2 className="text-xl font-bold text-[var(--ds-ink)]">このシフトで確定しました</h2>
            <div className="mt-4 grid max-w-md gap-2">
              <button type="button" onClick={() => window.print()} className="ds-btn w-full">
                印刷する
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void exportFile("jpeg")} className="ds-btn-secondary">
                  JPEG
                </button>
                <button type="button" onClick={() => void exportFile("pdf")} className="ds-btn-secondary">
                  PDF
                </button>
              </div>
              <button type="button" onClick={() => void share()} className="ds-btn-line w-full">
                共有する
              </button>
              <button
                type="button"
                onClick={() => {
                  reopenMonth();
                  router.push("/shifts");
                }}
                className="ds-btn-neutral w-full"
              >
                生成画面に戻る
              </button>
            </div>
            <div id="shift-print-sheet" className="mt-6">
              <PrintTable storeName={storeName} month={month} staff={staff} assignments={assignments} />
            </div>
          </section>
        ) : assignments.length === 0 ? (
          <p className="mt-8 text-sm text-slate-400">まだシフトはありません。希望が集まったら生成してください。</p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => goWeek(-1)}
                disabled={!canPrevWeek}
                aria-label="前の週"
                className={navCircleButtonClassName}
              >
                <Icon name="chevron_left" size={20} />
              </button>
              <div className="flex min-w-0 flex-1 justify-center">
                {weekDays.map((day) => (
                  <div key={day} className="m-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`h-16 w-14 rounded-2xl text-sm ${
                        day === date
                          ? "bg-[var(--ds-action)] text-white"
                          : "border border-[var(--ds-line)] bg-white text-[var(--ds-ink)]"
                      }`}
                    >
                      <span className="block font-bold">{Number(day.slice(8))}</span>
                      <span className="text-xs">{weekdayLabel(day)}</span>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => goWeek(1)}
                disabled={!canNextWeek}
                aria-label="次の週"
                className={navCircleButtonClassName}
              >
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {dayLabel(date)}（{weekdayLabel(date)}）の時間 {hours.start}–{hours.end} / 入っている時間{" "}
              {minutesToJapaneseHours(dayMinutes)}
            </p>
            <div className="mt-4">
              <DayTimeline date={date} />
            </div>
          </>
        )}
      </div>

      {!published && assignments.length > 0 && (
        <aside className="hidden w-64 shrink-0 flex-col border-l border-slate-200 bg-white lg:flex">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-sm font-bold text-slate-900">この日の希望</p>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-[11px] font-semibold text-slate-400">
              <span>名前</span>
              <span>希望</span>
            </div>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-auto px-4 pb-4 pt-2">
            {dayRequests.length === 0 && (
              <li className="rounded-xl bg-slate-50 px-3 py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
                  <span className="col-span-2 text-sm text-slate-400">希望はありません</span>
                </div>
              </li>
            )}
            {dayRequests.map((request) => {
              const member = staff.find((item) => item.id === request.staffId);
              const chip = hopeChip(request, member?.freeTimeRange);
              return (
                <li key={`${request.staffId}-${request.date}`} className="rounded-xl bg-slate-50 px-3 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {member ? staffLabel(member) : "スタッフ"}
                    </span>
                    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs ${chip.className}`}>
                      {chip.text}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      )}

      {modal === "warn" && (
        <Modal title="警告がありますが、よろしいですか？">
          <ul className="max-h-40 space-y-1 overflow-auto">
            {warnings.map((item) => (
              <li key={item.id}>{item.message}</li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setModal(null)} className="ds-btn-neutral">
              戻る
            </button>
            <button type="button" onClick={() => setModal("ok")} className="ds-btn">
              続ける
            </button>
          </div>
        </Modal>
      )}

      {modal === "ok" && (
        <Modal title="よろしいですか？">
          <ul className="max-h-64 space-y-2 overflow-auto">
            {achievement.map((item) => (
              <li key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.minimum > 0 ? (
                    <span className="shrink-0 text-xs text-slate-500">
                      {item.assigned >= item.minimum ? "達成" : "未達"}
                    </span>
                  ) : null}
                </div>
                <HoursCompareBar
                  requestedMinutes={item.requested}
                  assignedMinutes={item.assigned}
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setModal(null)} className="ds-btn-neutral">
              戻る
            </button>
            <button type="button" onClick={finish} className="ds-btn">
              OK
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PrintTable({
  storeName,
  month,
  staff,
  assignments,
}: {
  storeName: string;
  month: string;
  staff: { id: string; name: string; familyName?: string }[];
  assignments: { staffId: string; date: string; startTime: string; endTime: string }[];
}) {
  const days = daysOfMonth(month);
  return (
    <table className="w-full border-collapse text-[10px]">
      <caption className="mb-2 text-left text-base font-bold">
        {storeName} {monthLabel(month)}
      </caption>
      <thead>
        <tr>
          <th className="border border-slate-300 px-1 py-1 text-left">名前</th>
          {days.map((day) => (
            <th key={day} className="border border-slate-300 px-0.5 py-1">
              {Number(day.slice(8))}
              <br />
              {weekdayLabel(day)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {staff.map((member) => (
          <tr key={member.id}>
            <th className="border border-slate-300 px-1 py-1 text-left font-medium">{staffLabel(member)}</th>
            {days.map((day) => {
              const assignment = assignments.find(
                (item) => item.staffId === member.id && item.date === day,
              );
              return (
                <td key={day} className="border border-slate-200 px-0.5 py-1 text-center">
                  {assignment ? `${assignment.startTime}` : ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
