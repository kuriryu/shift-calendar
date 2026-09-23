"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityEntry,
  Role,
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
import { computeBreak, placeBreakStart } from "@/lib/generator";
import { toMinutes } from "@/lib/time";
import { parseCommand } from "@/lib/ai";

const DEFAULT_MONTH = "2026-10";

/** セレクタ用の安定した空配列（参照が変わらないようにする） */
export const EMPTY_ASSIGNMENTS: ShiftAssignment[] = [];
export const EMPTY_REQUESTS: ShiftRequest[] = [];

function uid(): string {
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_ACTIVITIES = 200;

function makeActivity(
  kind: ActivityEntry["kind"],
  message: string,
): ActivityEntry {
  return { id: uid(), at: new Date().toISOString(), kind, message };
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
  /** ガントチャートに表示する日付 */
  selectedDate: string;
  /** サイドバーの折りたたみ状態 */
  sidebarCollapsed: boolean;
  /** ガントから非表示にするスタッフID */
  hiddenStaffIds: string[];
  requests: Record<string, ShiftRequest[]>;
  assignments: Record<string, ShiftAssignment[]>;
  violations: Violation[];
  activities: ActivityEntry[];

  setMonth: (month: string) => void;
  setSelectedDate: (date: string) => void;
  toggleSidebar: () => void;
  toggleStaffFilter: (staffId: string) => void;
  toggleRoleFilter: (role: Role) => void;
  addStaff: (staff: Omit<Staff, "id">) => void;
  setRequest: (req: ShiftRequest) => void;
  clearRequest: (staffId: string, date: string) => void;
  bulkSetRequests: (staffId: string, type: "available" | "off") => void;
  clearAllRequests: () => void;
  fillTestRequests: () => void;
  generate: () => void;
  updateAssignment: (a: ShiftAssignment) => void;
  removeAssignment: (id: string) => void;
  addAssignment: (
    a: Omit<ShiftAssignment, "id" | "source" | "breakMinutes" | "breakStartTime"> & {
      /** 省略時は実働時間から自動計算 */
      breakMinutes?: number;
      breakStartTime?: string;
    },
  ) => void;
  applyAiCommand: (text: string) => string;
  updateSettings: (s: Partial<ShopSettings>) => void;
  updateStaff: (staff: Staff) => void;
  recordLogin: (email: string) => void;
  clearLoginHistory: () => void;
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
        selectedDate: `${DEFAULT_MONTH}-01`,
        // スマートフォンではデフォルトで折りたたみ
        sidebarCollapsed:
          typeof window !== "undefined" && window.innerWidth < 640,
        hiddenStaffIds: [],
        requests: {},
        assignments: {},
        violations: [],
        activities: [],

        setMonth: (month) =>
          set((s) => {
            // 選択日も新しい月にクランプして移動
            const day = Math.min(
              Number(s.selectedDate.slice(8)),
              daysOfMonth(month).length,
            );
            const selectedDate = `${month}-${String(day).padStart(2, "0")}`;
            return {
              selectedMonth: month,
              selectedDate,
              ...revalidate({ ...s, selectedMonth: month }),
            };
          }),

        setSelectedDate: (date) =>
          set((s) => {
            const month = date.slice(0, 7);
            if (month === s.selectedMonth) return { selectedDate: date };
            return {
              selectedDate: date,
              selectedMonth: month,
              ...revalidate({ ...s, selectedMonth: month }),
            };
          }),

        toggleSidebar: () =>
          set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

        toggleStaffFilter: (staffId) =>
          set((s) => ({
            hiddenStaffIds: s.hiddenStaffIds.includes(staffId)
              ? s.hiddenStaffIds.filter((id) => id !== staffId)
              : [...s.hiddenStaffIds, staffId],
          })),

        toggleRoleFilter: (role) =>
          set((s) => {
            const ids = s.staff
              .filter((x) => x.role === role)
              .map((x) => x.id);
            const anyVisible = ids.some(
              (id) => !s.hiddenStaffIds.includes(id),
            );
            return {
              hiddenStaffIds: anyVisible
                ? [...new Set([...s.hiddenStaffIds, ...ids])]
                : s.hiddenStaffIds.filter((id) => !ids.includes(id)),
            };
          }),

        addStaff: (partial) =>
          set((s) => ({
            staff: [
              ...s.staff,
              { ...partial, id: `staff-${Date.now().toString(36)}` },
            ],
            activities: [
              makeActivity("staff", `${partial.name} を新規登録`),
              ...s.activities,
            ].slice(0, MAX_ACTIVITIES),
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
            return {
              assignments,
              activities: [
                makeActivity("generate", `${month} のシフトを自動生成（${generated.length}件）`),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, assignments }),
            };
          }),

        updateAssignment: (a) =>
          set((s) => {
            const month = a.date.slice(0, 7);
            const staffName =
              s.staff.find((x) => x.id === a.staffId)?.name ?? a.staffId;
            const assignments = {
              ...s.assignments,
              [month]: (s.assignments[month] ?? []).map((x) =>
                x.id === a.id ? a : x,
              ),
            };
            return {
              assignments,
              activities: [
                makeActivity(
                  "manual",
                  `${a.date.slice(5)} ${staffName} のシフトを ${a.startTime}–${a.endTime} に変更`,
                ),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, assignments }),
            };
          }),

        removeAssignment: (id) =>
          set((s) => {
            const month = s.selectedMonth;
            const target = (s.assignments[month] ?? []).find(
              (x) => x.id === id,
            );
            const staffName = target
              ? (s.staff.find((x) => x.id === target.staffId)?.name ??
                target.staffId)
              : "";
            const assignments = {
              ...s.assignments,
              [month]: (s.assignments[month] ?? []).filter((x) => x.id !== id),
            };
            return {
              assignments,
              activities: [
                makeActivity(
                  "manual",
                  `${target?.date.slice(5) ?? ""} ${staffName} のシフトを削除`,
                ),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, assignments }),
            };
          }),

        addAssignment: (partial) =>
          set((s) => {
            const month = partial.date.slice(0, 7);
            const brk =
              partial.breakMinutes !== undefined
                ? {
                    breakMinutes: partial.breakMinutes,
                    breakStartTime:
                      partial.breakMinutes > 0
                        ? (partial.breakStartTime ??
                          placeBreakStart(
                            toMinutes(partial.startTime),
                            toMinutes(partial.endTime),
                            partial.breakMinutes,
                          ))
                        : undefined,
                  }
                : computeBreak(partial.startTime, partial.endTime);
            const a: ShiftAssignment = {
              ...partial,
              ...brk,
              id: uid(),
              source: "manual",
            };
            const staffName =
              s.staff.find((x) => x.id === partial.staffId)?.name ??
              partial.staffId;
            const assignments = {
              ...s.assignments,
              [month]: [...(s.assignments[month] ?? []), a],
            };
            return {
              assignments,
              activities: [
                makeActivity(
                  "manual",
                  `${partial.date.slice(5)} ${staffName} のシフトを追加（${partial.startTime}–${partial.endTime}）`,
                ),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, assignments }),
            };
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
          const reply = `${parsed.summary} しました。現在の違反: エラー${errors}件 / 警告${warnings}件`;
          set((prev) => ({
            activities: [
              makeActivity("ai", `AI指示「${text}」→ ${parsed.summary}`),
              ...prev.activities,
            ].slice(0, MAX_ACTIVITIES),
          }));
          return reply;
        },

        updateSettings: (partial) =>
          set((s) => {
            const settings = { ...s.settings, ...partial };
            return { settings, ...revalidate({ ...s, settings }) };
          }),

        updateStaff: (staff) =>
          set((s) => ({
            staff: s.staff.map((x) => (x.id === staff.id ? staff : x)),
            activities: [
              makeActivity("staff", `${staff.name} のスタッフ情報を更新`),
              ...s.activities,
            ].slice(0, MAX_ACTIVITIES),
          })),

        recordLogin: (email) =>
          set((s) => {
            const last = s.activities.find((a) => a.kind === "login");
            // 30分以内の連続記録はスキップ
            if (
              last &&
              Date.now() - new Date(last.at).getTime() < 30 * 60 * 1000
            ) {
              return {};
            }
            return {
              activities: [
                makeActivity("login", `${email} がログイン`),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
            };
          }),

        clearLoginHistory: () =>
          set((s) => ({
            activities: s.activities.filter((a) => a.kind !== "login"),
          })),
      };
    },
    {
      name: "shift-app-v1",
      version: 4,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<{
          staff: Staff[];
          settings: ShopSettings;
          selectedMonth: string;
          selectedDate: string;
          sidebarCollapsed: boolean;
          hiddenStaffIds: string[];
          requests: Record<string, ShiftRequest[]>;
          assignments: Record<string, ShiftAssignment[]>;
          activities: ActivityEntry[];
        }>;
        const selectedMonth = p.selectedMonth ?? DEFAULT_MONTH;
        return {
          staff: p.staff ?? INITIAL_STAFF,
          settings: p.settings ?? DEFAULT_SETTINGS,
          selectedMonth,
          selectedDate: p.selectedDate ?? `${selectedMonth}-01`,
          sidebarCollapsed: p.sidebarCollapsed ?? false,
          hiddenStaffIds: p.hiddenStaffIds ?? [],
          requests: p.requests ?? {},
          assignments: p.assignments ?? {},
          // v3: 過去のログイン履歴を全削除（編集履歴は保持）
          activities: (p.activities ?? []).filter((a) => a.kind !== "login"),
        };
      },
      partialize: (s) => ({
        staff: s.staff,
        settings: s.settings,
        selectedMonth: s.selectedMonth,
        selectedDate: s.selectedDate,
        sidebarCollapsed: s.sidebarCollapsed,
        hiddenStaffIds: s.hiddenStaffIds,
        requests: s.requests,
        assignments: s.assignments,
        activities: s.activities,
      }),
    },
  ),
);
