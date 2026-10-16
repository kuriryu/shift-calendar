"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DayTimeline from "@/components/DayTimeline";
import Modal from "@/components/workspace/Modal";
import { hopeChip } from "@/components/DayRequestList";
import { dayLabel, daysOfMonth, monthLabel, weekdayLabel } from "@/lib/dates";
import { businessRange, requestedMinutesOf, assignedMinutesOf } from "@/lib/hope-hours";
import { drawShiftJpeg, downloadJpeg, downloadPdf } from "@/lib/print-shift";
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
    const path = storeId ? `${location.origin}/share/${storeId}/${month}` : location.href;
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
          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
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
              className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:opacity-40"
            >
              完了
            </button>
          </div>
        </aside>
      )}

      <div className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">シフト表</h1>
            <p className="text-sm text-slate-500">{monthLabel(month)}</p>
          </div>
          {!published && (
            <button
              type="button"
              onClick={generateShift}
              disabled={staff.length === 0}
              className="h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-40"
            >
              シフトを生成
            </button>
          )}
        </div>

        {published ? (
          <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">このシフトで確定しました</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="h-11 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white">
                印刷
              </button>
              <button type="button" onClick={() => void exportFile("jpeg")} className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                JPEG
              </button>
              <button type="button" onClick={() => void exportFile("pdf")} className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                PDF
              </button>
              <button type="button" onClick={() => void share()} className="h-11 rounded-full bg-[#06C755] px-4 text-sm font-semibold text-white">
                共有
              </button>
              <button
                type="button"
                onClick={() => {
                  reopenMonth();
                  router.push("/shifts");
                }}
                className="h-11 rounded-full bg-white px-4 text-sm font-semibold text-blue-700 ring-1 ring-blue-200"
              >
                希望の修正が来たら生成画面に戻る
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
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {days.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`h-16 w-14 shrink-0 rounded-2xl text-sm ${
                    day === date ? "bg-blue-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  <span className="block font-bold">{Number(day.slice(8))}</span>
                  <span className="text-xs">{weekdayLabel(day)}</span>
                </button>
              ))}
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
          <p className="px-4 py-4 text-sm font-bold text-slate-900">この日の希望</p>
          <ul className="min-h-0 flex-1 space-y-2 overflow-auto px-4 pb-4">
            {dayRequests.length === 0 && <li className="text-sm text-slate-400">希望はありません</li>}
            {dayRequests.map((request) => {
              const member = staff.find((item) => item.id === request.staffId);
              const chip = hopeChip(request, member?.freeTimeRange);
              return (
                <li key={`${request.staffId}-${request.date}`} className="rounded-xl bg-slate-50 px-3 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {member ? staffLabel(member) : "スタッフ"}
                  </p>
                  <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${chip.className}`}>{chip.text}</p>
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
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setModal(null)} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold">
              戻る
            </button>
            <button type="button" onClick={() => setModal("ok")} className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white">
              続ける
            </button>
          </div>
        </Modal>
      )}

      {modal === "ok" && (
        <Modal title="よろしいですか？">
          <ul className="max-h-64 space-y-2 overflow-auto">
            {achievement.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span>
                  希望 {minutesToJapaneseHours(item.requested)} / 割当 {minutesToJapaneseHours(item.assigned)}
                  {item.minimum > 0
                    ? item.assigned >= item.minimum
                      ? " 達成"
                      : " 未達"
                    : ""}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setModal(null)} className="h-11 flex-1 rounded-xl bg-slate-100 text-sm font-semibold">
              戻る
            </button>
            <button type="button" onClick={finish} className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white">
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
