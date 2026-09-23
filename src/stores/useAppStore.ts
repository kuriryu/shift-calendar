"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ShiftAssignment,
  ShiftRequest,
  ShopSettings,
  Staff,
  Violation,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { INITIAL_STAFF } from "@/lib/staff-data";
import { daysOfMonth } from "@/lib/dates";
import { generateMonth } from "@/lib/generator";
import { validateMonth } from "@/lib/validator";
import { computeBreak } from "@/lib/generator";
import { parseCommand } from "@/lib/ai";

const DEFAULT_MONTH = "2026-10";

function uid(): string {
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** デモ用の希望休を生成（決定的: 再実行しても同じ結果） */
function buildTestRequests(staffList: Staff[], month: string): ShiftRequest[] {
  const days = daysOfMonth(month);
  const requests: ShiftRequest[] = [];
  staffList.forEach((s, idx) => {
    if (s.role === "employee") return; // 社員の休みは自動ローテ
    const interval = s.role === "part_time" ? 7 : 5;
    days.forEach((date, dayIdx) => {
      const dayNum = dayIdx + 1;
      if ((dayNum + idx) % interval === 0) {
        requests.push({ staffId: s.id, date, type: "off" });
      }
    });
    // デモ用の時間指定希望を数件
    if (s.role === "part_time" && idx % 3 === 0) {
      const date = days[(idx * 2) % days.length];
      requests.push({
        staffId: s.id,
        date,
        type: "time_limited",
        timeRange: { start: "09:00", end: "14:00" },
      });
    }
  });
  return requests;
}

type AppState = {
  staff: Staff[];
  settings: ShopSettings;
  selectedMonth: string;
  requests: Record<string, ShiftRequest[]>;
  assignments: Record<string, ShiftAssignment[]>;
  violations: Violation[];

  setMonth: (month: string) => void;
  setRequest: (req: ShiftRequest) => void;
  clearRequest: (staffId: string, date: string) => void;
  bulkSetRequests: (staffId: string, type: "available" | "off") => void;
  clearAllRequests: () => void;
  fillTestRequests: () => void;
  generate: () => void;
  updateAssignment: (a: ShiftAssignment) => void;
  removeAssignment: (id: string) => void;
  addAssignment: (
    a: Omit<ShiftAssignment, "id" | "source" | "breakMinutes" | "breakStartTime">,
  ) => void;
  applyAiCommand: (text: string) => string;
  updateSettings: (s: Partial<ShopSettings>) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const revalidate = (state: {
        selectedMonth: string;
        assignments: Record<string, ShiftAssignment[]>;
        requests: Record<string, ShiftRequest[]>;
        settings: ShopSettings;
      }) => ({
        violations: validateMonth(
          state.selectedMonth,
          get().staff,
          state.requests[state.selectedMonth] ?? [],
          state.assignments[state.selectedMonth] ?? [],
          state.settings,
        ),
      });

      return {
        staff: INITIAL_STAFF,
        settings: DEFAULT_SETTINGS,
        selectedMonth: DEFAULT_MONTH,
        requests: {},
        assignments: {},
        violations: [],

        setMonth: (month) =>
          set((s) => ({
            selectedMonth: month,
            ...revalidate({ ...s, selectedMonth: month }),
          })),

        setRequest: (req) =>
          set((s) => {
            const month = req.date.slice(0, 7);
            const list = (s.requests[month] ?? []).filter(
              (r) => !(r.staffId === req.staffId && r.date === req.date),
            );
            const requests = { ...s.requests, [month]: [...list, req] };
            return { requests, ...revalidate({ ...s, requests }) };
          }),

        clearRequest: (staffId, date) =>
          set((s) => {
            const month = date.slice(0, 7);
            const requests = {
              ...s.requests,
              [month]: (s.requests[month] ?? []).filter(
                (r) => !(r.staffId === staffId && r.date === date),
              ),
            };
            return { requests, ...revalidate({ ...s, requests }) };
          }),

        bulkSetRequests: (staffId, type) =>
          set((s) => {
            const month = s.selectedMonth;
            const days = daysOfMonth(month);
            const others = (s.requests[month] ?? []).filter(
              (r) => r.staffId !== staffId,
            );
            const mine: ShiftRequest[] = days.map((date) => ({
              staffId,
              date,
              type,
            }));
            const requests = { ...s.requests, [month]: [...others, ...mine] };
            return { requests, ...revalidate({ ...s, requests }) };
          }),

        clearAllRequests: () =>
          set((s) => {
            const requests = { ...s.requests, [s.selectedMonth]: [] };
            return { requests, ...revalidate({ ...s, requests }) };
          }),

        fillTestRequests: () =>
          set((s) => {
            const requests = {
              ...s.requests,
              [s.selectedMonth]: buildTestRequests(s.staff, s.selectedMonth),
            };
            return { requests, ...revalidate({ ...s, requests }) };
          }),

        generate: () =>
          set((s) => {
            const month = s.selectedMonth;
            const generated = generateMonth(
              month,
              s.staff,
              s.requests[month] ?? [],
              s.settings,
            );
            const assignments = { ...s.assignments, [month]: generated };
            return { assignments, ...revalidate({ ...s, assignments }) };
          }),

        updateAssignment: (a) =>
          set((s) => {
            const month = a.date.slice(0, 7);
            const assignments = {
              ...s.assignments,
              [month]: (s.assignments[month] ?? []).map((x) =>
                x.id === a.id ? a : x,
              ),
            };
            return { assignments, ...revalidate({ ...s, assignments }) };
          }),

        removeAssignment: (id) =>
          set((s) => {
            const month = s.selectedMonth;
            const assignments = {
              ...s.assignments,
              [month]: (s.assignments[month] ?? []).filter((x) => x.id !== id),
            };
            return { assignments, ...revalidate({ ...s, assignments }) };
          }),

        addAssignment: (partial) =>
          set((s) => {
            const month = partial.date.slice(0, 7);
            const brk = computeBreak(partial.startTime, partial.endTime);
            const a: ShiftAssignment = {
              ...partial,
              ...brk,
              id: uid(),
              source: "manual",
            };
            const assignments = {
              ...s.assignments,
              [month]: [...(s.assignments[month] ?? []), a],
            };
            return { assignments, ...revalidate({ ...s, assignments }) };
          }),

        applyAiCommand: (text) => {
          const s = get();
          const parsed = parseCommand(text, s.staff, s.selectedMonth);
          if (!parsed.ok) return parsed.reply;

          const month = s.selectedMonth;
          const list = s.assignments[month] ?? [];
          const cmd = parsed.command;

          if (cmd.kind === "swap") {
            const a = list.find(
              (x) => x.date === cmd.date && x.staffId === cmd.staffAId,
            );
            const b = list.find(
              (x) => x.date === cmd.date && x.staffId === cmd.staffBId,
            );
            if (!a || !b) {
              return `${cmd.date.slice(8)}日 は両名ともシフトが入っていないため交代できませんでした。`;
            }
            const swapped = list.map((x) => {
              if (x.id === a.id) return { ...x, staffId: cmd.staffBId, source: "ai" as const };
              if (x.id === b.id) return { ...x, staffId: cmd.staffAId, source: "ai" as const };
              return x;
            });
            set((prev) => {
              const assignments = { ...prev.assignments, [month]: swapped };
              return { assignments, ...revalidate({ ...prev, assignments }) };
            });
          } else if (cmd.kind === "set_time") {
            const a = list.find(
              (x) => x.date === cmd.date && x.staffId === cmd.staffId,
            );
            if (!a) {
              return `${cmd.date.slice(8)}日 に対象スタッフのシフトが見つかりませんでした。`;
            }
            const brk = computeBreak(cmd.start, cmd.end);
            const updated = list.map((x) =>
              x.id === a.id
                ? { ...x, startTime: cmd.start, endTime: cmd.end, ...brk, source: "ai" as const }
                : x,
            );
            set((prev) => {
              const assignments = { ...prev.assignments, [month]: updated };
              return { assignments, ...revalidate({ ...prev, assignments }) };
            });
          } else if (cmd.kind === "set_off") {
            const a = list.find(
              (x) => x.date === cmd.date && x.staffId === cmd.staffId,
            );
            if (!a) {
              return `${cmd.date.slice(8)}日 に対象スタッフのシフトが見つかりませんでした。`;
            }
            const updated = list.filter((x) => x.id !== a.id);
            set((prev) => {
              const assignments = { ...prev.assignments, [month]: updated };
              return { assignments, ...revalidate({ ...prev, assignments }) };
            });
          } else if (cmd.kind === "close_to_employee") {
            const dayList = list.filter((x) => x.date === cmd.date);
            if (dayList.length === 0) {
              return `${cmd.date.slice(8)}日 のシフトがまだありません。先に自動生成してください。`;
            }
            const latest = [...dayList].sort((x, y) =>
              y.endTime.localeCompare(x.endTime),
            )[0];
            const assignedIds = new Set(dayList.map((x) => x.staffId));
            const freeEmployee = s.staff.find(
              (st) => st.role === "employee" && !assignedIds.has(st.id),
            );
            if (!freeEmployee) {
              return `${cmd.date.slice(8)}日 は社員3名ともシフトに入っているため、ラスト枠を空いている社員に変更できませんでした。`;
            }
            const updated = list.map((x) =>
              x.id === latest.id
                ? { ...x, staffId: freeEmployee.id, source: "ai" as const }
                : x,
            );
            set((prev) => {
              const assignments = { ...prev.assignments, [month]: updated };
              return { assignments, ...revalidate({ ...prev, assignments }) };
            });
          }

          const after = get().violations;
          const errors = after.filter((v) => v.severity === "error").length;
          const warnings = after.filter((v) => v.severity === "warning").length;
          return `${parsed.summary} しました。現在の違反: エラー${errors}件 / 警告${warnings}件`;
        },

        updateSettings: (partial) =>
          set((s) => {
            const settings = { ...s.settings, ...partial };
            return { settings, ...revalidate({ ...s, settings }) };
          }),
      };
    },
    {
      name: "shift-app-v1",
      partialize: (s) => ({
        settings: s.settings,
        selectedMonth: s.selectedMonth,
        requests: s.requests,
        assignments: s.assignments,
      }),
    },
  ),
);
