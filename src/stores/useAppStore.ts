"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityEntry,
  HighlightTarget,
  ReceptionWindow,
  Role,
  ShiftAssignment,
  ShiftRequest,
  ShopPlace,
  ShopSettings,
  Staff,
  StepId,
  TimeRange,
  Violation,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { INITIAL_STAFF } from "@/lib/staff-data";
import { daysOfMonth, nextMonthOf } from "@/lib/dates";
import {
  recommendationRequestOf,
  requestsMatch,
} from "@/lib/staff-pattern";
import { ROLE_ORDER } from "@/lib/roles";
import { generateMonth } from "@/lib/generator";
import { validateMonth } from "@/lib/validator";
import { computeBreak, placeBreakStart } from "@/lib/generator";
import {
  DAILY_HOUR_LIMIT_ALERT,
  exceedsDailyHourLimit,
  toMinutes,
  workMinutesOf,
} from "@/lib/time";
import { parseCommand } from "@/lib/ai";
import type { SharedSnapshot } from "@/lib/shared-snapshot";
import {
  applyHopeToBook,
  defaultReception,
  emptyBook,
  mergeHopes,
  type StoreBook,
} from "@/lib/store-book";

const DEFAULT_MONTH = nextMonthOf();
export const DEFAULT_STORE_ID = "st-oimachi";
export const DEFAULT_STORE_NAME = "大井町店";

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

/**
 * 未入力の日付にだけ基本パターン／固定休を入れる。
 * 既にユーザーが入れた希望は上書きしない。
 */
function fillEmptyFromPatterns(
  existing: ShiftRequest[],
  staffList: Staff[],
  month: string,
  staffId?: string,
): { next: ShiftRequest[]; added: number } {
  const days = daysOfMonth(month);
  const has = new Set(existing.map((r) => `${r.staffId}:${r.date}`));
  const targets = staffId
    ? staffList.filter((x) => x.id === staffId)
    : staffList;
  const added: ShiftRequest[] = [];
  for (const st of targets) {
    for (const date of days) {
      if (has.has(`${st.id}:${date}`)) continue;
      const rec = recommendationRequestOf(st, date);
      if (rec) added.push(rec);
    }
  }
  if (added.length === 0) return { next: existing, added: 0 };
  return { next: [...existing, ...added], added: added.length };
}

/** 希望がまだ無い日は休みとして入れる。入っている希望は変えない。 */
function fillEmptyWithOff(
  existing: ShiftRequest[],
  staffList: Staff[],
  month: string,
): { next: ShiftRequest[]; added: number } {
  const days = daysOfMonth(month);
  const has = new Set(existing.map((r) => `${r.staffId}:${r.date}`));
  const added: ShiftRequest[] = [];
  for (const st of staffList) {
    for (const date of days) {
      if (has.has(`${st.id}:${date}`)) continue;
      added.push({ staffId: st.id, date, type: "off" });
    }
  }
  if (added.length === 0) return { next: existing, added: 0 };
  return { next: [...existing, ...added], added: added.length };
}

/**
 * スタッフのパターン変更に追従。
 * 「未入力」または「変更前パターンと一致」するセルだけ新パターンへ更新する。
 */
function syncStaffPatternRequests(
  existing: ShiftRequest[],
  prev: Staff | undefined,
  nextStaff: Staff,
  month: string,
): ShiftRequest[] {
  const days = daysOfMonth(month);
  const byKey = new Map<string, ShiftRequest>(
    existing.map((r) => [`${r.staffId}:${r.date}`, r]),
  );
  for (const date of days) {
    const key = `${nextStaff.id}:${date}`;
    const current = byKey.get(key);
    const oldRec = prev ? recommendationRequestOf(prev, date) : null;
    const newRec = recommendationRequestOf(nextStaff, date);
    const isBlank = !current;
    const wasPattern = requestsMatch(current, oldRec);
    if (!isBlank && !wasPattern) continue;
    if (newRec) byKey.set(key, newRec);
    else byKey.delete(key);
  }
  return [...byKey.values()];
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

function packFromState(state: {
  staff: Staff[];
  settings: ShopSettings;
  requests: Record<string, ShiftRequest[]>;
  assignments: Record<string, ShiftAssignment[]>;
  receptions: Record<string, ReceptionWindow>;
  hopeNotes: Record<string, { staffId: string; message: string }[]>;
  budgetHours: number;
  publishedMonths: string[];
  selectedMonth: string;
  selectedDate: string;
  hopeStamps: Record<string, number>;
}): StoreBook {
  return {
    staff: state.staff,
    settings: state.settings,
    requests: state.requests,
    assignments: state.assignments,
    receptions: state.receptions,
    notes: state.hopeNotes,
    budgetHours: state.budgetHours,
    published: state.publishedMonths,
    selectedMonth: state.selectedMonth,
    selectedDate: state.selectedDate,
    hopeStamps: state.hopeStamps,
  };
}

function unpackBook(book: StoreBook) {
  return {
    staff: book.staff,
    settings: book.settings,
    requests: book.requests,
    assignments: book.assignments,
    receptions: book.receptions,
    hopeNotes: book.notes,
    budgetHours: book.budgetHours,
    publishedMonths: book.published,
    selectedMonth: book.selectedMonth,
    selectedDate: book.selectedDate,
    hopeStamps: book.hopeStamps,
  };
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
  /** 旧初期値（週20時間・連勤3日）を未設定へ移したか */
  hourDefaultsMigrated: boolean;

  // ── 以下は永続化しない一時状態 ──
  /** シフト作成フローに入ったか（false のときヒーロー表示） */
  createStarted: boolean;
  /** シフト作成フローの現在ステップ（null は自動判定） */
  currentStep: StepId | null;
  /** ステップ6（調整）の表示モード */
  adjustView: "day" | "week" | "month";
  /** 確定前の仮生成結果 */
  draft: {
    month: string;
    assignments: ShiftAssignment[];
    violations: Violation[];
  } | null;
  /** 違反箇所のハイライト */
  highlight: HighlightTarget | null;
  stores: ShopPlace[];
  activeStoreId: string | null;
  /** 初回の大井町店を一度作ったあとは、削除した店舗を自動では戻さない */
  defaultStoreSeeded: boolean;
  storeBooks: Record<string, StoreBook>;
  receptions: Record<string, ReceptionWindow>;
  hopeNotes: Record<string, { staffId: string; message: string }[]>;
  budgetHours: number;
  publishedMonths: string[];
  hopeStamps: Record<string, number>;
  issueOpen: boolean;

  setMonth: (month: string) => void;
  setSelectedDate: (date: string) => void;
  /** ヒーローから作成フローへ（ステップ1） */
  startCreate: () => void;
  /** 作成フローを終了してヒーローへ戻る */
  showHero: () => void;
  toggleSidebar: () => void;
  toggleStaffFilter: (staffId: string) => void;
  toggleRoleFilter: (role: Role) => void;
  addStaff: (staff: Omit<Staff, "id">) => void;
  /** スタッフ一覧の並び替え（ドラッグ移動） */
  reorderStaff: (draggedId: string, targetId: string) => void;
  /** スタッフを名前順（日本語ロケール）に並べ替え */
  /** スタッフを名前順（日本語ロケール）に並べ替え */
  sortStaffByName: () => void;
  /** スタッフを属性順（社員→パート→学生）、同属性内は名前順 */
  sortStaffByRole: () => void;
  setRequest: (req: ShiftRequest) => void;
  clearRequest: (staffId: string, date: string) => void;
  bulkSetRequests: (staffId: string, type: "available" | "off") => void;
  /** 基本パターン・固定休から作ったリコメンドを希望として一括採用（staffId 省略で全員） */
  adoptRecommendations: (staffId?: string, opts?: { silent?: boolean }) => void;
  clearAllRequests: () => void;
  fillTestRequests: () => void;
  generate: () => void;
  /** 希望未入力の日を休みで埋める */
  ensureDefaultOffs: () => void;
  /** 仮生成（ストアには反映しない） */
  generateDraft: () => void;
  /** 仮生成結果を確定してストアに反映 */
  confirmDraft: () => void;
  discardDraft: () => void;
  setStep: (step: StepId) => void;
  setAdjustView: (view: "day" | "week" | "month") => void;
  /** 違反をクリックしたときに該当箇所へ移動・ハイライト */
  focusViolation: (v: Violation) => void;
  clearHighlight: () => void;
  resetSettings: () => void;
  /** 違反リストを再計算（LocalStorage 復元直後などに使う） */
  recompute: () => void;
  /** 共通の保存データでスタッフ・条件・希望・シフトを置き換える */
  applyShared: (doc: SharedSnapshot) => void;
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
  removeStaff: (staffId: string) => void;
  recordLogin: (email: string) => void;
  clearLoginHistory: () => void;
  createStore: (name: string) => string;
  /** 大井町店が無ければ追加し、その店舗IDを返す */
  ensureDefaultStore: () => string;
  /** いま開いている店舗を削除し、残っていれば次の店舗IDを返す */
  deleteActiveStore: () => string | null;
  selectStore: (id: string) => void;
  closeStore: () => void;
  setReception: (month: string, patch: Partial<ReceptionWindow>) => void;
  setBudgetHours: (hours: number) => void;
  setIssueOpen: (open: boolean) => void;
  publishMonth: () => void;
  reopenMonth: () => void;
  submitHope: (input: {
    storeId: string;
    staffId: string;
    month: string;
    requests: ShiftRequest[];
    note: string;
    freeTime?: TimeRange;
  }) => void;
  mergeRemoteBook: (storeId: string, remote: StoreBook) => void;
  exportBooks: () => Record<string, StoreBook & { name: string }>;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const revalidate = (state: {
        selectedMonth: string;
        assignments: Record<string, ShiftAssignment[]>;
        requests: Record<string, ShiftRequest[]>;
        settings: ShopSettings;
      }) => {
        const monthAssignments = state.assignments[state.selectedMonth] ?? [];
        // シフト未作成の月は「人員不足」で埋まるだけなのでチェックしない
        if (monthAssignments.length === 0) return { violations: [] };
        return {
          violations: validateMonth(
            state.selectedMonth,
            get().staff,
            state.requests[state.selectedMonth] ?? [],
            monthAssignments,
            state.settings,
          ),
        };
      };

      if (typeof window !== "undefined") {
        queueMicrotask(() => {
          const current = get();
          if (current.hourDefaultsMigrated) return;
          set({
            hourDefaultsMigrated: true,
            staff: current.staff.map((s) =>
              s.maxHoursPerWeek === 20 && s.maxConsecutiveDays === 3
                ? { ...s, maxHoursPerWeek: 0, maxConsecutiveDays: 0 }
                : s,
            ),
          });
          get().recompute();
        });
      }

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
        hourDefaultsMigrated: false,
        createStarted: false,
        currentStep: null,
        adjustView: "day",
        draft: null,
        highlight: null,
        stores: [],
        activeStoreId: null,
        defaultStoreSeeded: false,
        storeBooks: {},
        receptions: {},
        hopeNotes: {},
        budgetHours: 0,
        publishedMonths: [],
        hopeStamps: {},
        issueOpen: false,

        setMonth: (month) =>
          set((s) => {
            // 選択日も新しい月にクランプして移動
            const day = Math.min(
              Number(s.selectedDate.slice(8)),
              daysOfMonth(month).length,
            );
            const selectedDate = `${month}-${String(day).padStart(2, "0")}`;
            const { next } = fillEmptyFromPatterns(
              s.requests[month] ?? [],
              s.staff,
              month,
            );
            const requests = { ...s.requests, [month]: next };
            const existing = s.receptions[month];
            const fallback = defaultReception(month);
            const from = existing?.from.startsWith(month) ? existing.from : fallback.from;
            const to = existing?.to.startsWith(month) ? existing.to : fallback.to;
            const receptions =
              existing && existing.from === from && existing.to === to
                ? s.receptions
                : {
                    ...s.receptions,
                    [month]: { open: existing?.open ?? false, from, to },
                  };
            return {
              selectedMonth: month,
              selectedDate,
              requests,
              receptions,
              ...revalidate({ ...s, selectedMonth: month, requests }),
            };
          }),

        setSelectedDate: (date) =>
          set((s) => {
            const month = date.slice(0, 7);
            if (month === s.selectedMonth) return { selectedDate: date };
            const { next } = fillEmptyFromPatterns(
              s.requests[month] ?? [],
              s.staff,
              month,
            );
            const requests = { ...s.requests, [month]: next };
            return {
              selectedDate: date,
              selectedMonth: month,
              requests,
              ...revalidate({ ...s, selectedMonth: month, requests }),
            };
          }),

        startCreate: () => set({ createStarted: true, currentStep: 1 }),
        showHero: () => set({ createStarted: false, currentStep: null }),

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
          set((s) => {
            const created: Staff = {
              ...partial,
              id: `staff-${Date.now().toString(36)}`,
            };
            const staff = [...s.staff, created];
            const month = s.selectedMonth;
            const { next } = fillEmptyFromPatterns(
              s.requests[month] ?? [],
              [created],
              month,
              created.id,
            );
            const requests = { ...s.requests, [month]: next };
            return {
              staff,
              requests,
              activities: [
                makeActivity("staff", `${partial.name} を新規登録`),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, requests }),
            };
          }),

        reorderStaff: (draggedId, targetId) =>
          set((s) => {
            if (draggedId === targetId) return {};
            const from = s.staff.findIndex((x) => x.id === draggedId);
            const to = s.staff.findIndex((x) => x.id === targetId);
            if (from < 0 || to < 0) return {};
            const next = [...s.staff];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return { staff: next };
          }),

        sortStaffByName: () =>
          set((s) => ({
            staff: [...s.staff].sort((a, b) =>
              a.name.localeCompare(b.name, "ja", { sensitivity: "base" }),
            ),
          })),

        sortStaffByRole: () =>
          set((s) => ({
            staff: [...s.staff].sort((a, b) => {
              const ra = ROLE_ORDER.indexOf(a.role);
              const rb = ROLE_ORDER.indexOf(b.role);
              if (ra !== rb) return ra - rb;
              return a.name.localeCompare(b.name, "ja", { sensitivity: "base" });
            }),
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

        adoptRecommendations: (staffId, opts) =>
          set((s) => {
            const month = s.selectedMonth;
            const existing = s.requests[month] ?? [];
            const days = daysOfMonth(month);
            const byKey = new Map(
              existing.map((r) => [`${r.staffId}:${r.date}`, r]),
            );
            const targets = staffId
              ? s.staff.filter((st) => st.id === staffId)
              : s.staff;
            let added = 0;
            for (const st of targets) {
              for (const date of days) {
                const rec = recommendationRequestOf(st, date);
                if (!rec || rec.type === "off") continue;
                const key = `${st.id}:${date}`;
                const current = byKey.get(key);
                if (current && current.type !== "off") continue;
                if (requestsMatch(current, rec)) continue;
                byKey.set(key, rec);
                added++;
              }
            }
            if (added === 0) return {};
            const next = [...byKey.values()];
            const requests = { ...s.requests, [month]: next };
            return {
              requests,
              activities: opts?.silent
                ? s.activities
                : [
                    makeActivity(
                      "request",
                      `${month} の希望候補を${added}件採用${staffId ? "" : "（全員）"}`,
                    ),
                    ...s.activities,
                  ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, requests }),
            };
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

        generateDraft: () =>
          set((s) => {
            const month = s.selectedMonth;
            const generated = generateMonth(
              month,
              s.staff,
              s.requests[month] ?? [],
              s.settings,
            );
            const violations = validateMonth(
              month,
              s.staff,
              s.requests[month] ?? [],
              generated,
              s.settings,
            );
            return {
              draft: { month, assignments: generated, violations },
            };
          }),

        confirmDraft: () =>
          set((s) => {
            if (!s.draft) return {};
            const { month, assignments: generated } = s.draft;
            const assignments = { ...s.assignments, [month]: generated };
            return {
              assignments,
              draft: null,
              activities: [
                makeActivity(
                  "generate",
                  `${month} のシフトを確定（自動生成 ${generated.length}件）`,
                ),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, assignments }),
            };
          }),

        discardDraft: () => set({ draft: null }),

        ensureDefaultOffs: () =>
          set((s) => {
            const month = s.selectedMonth;
            const { next, added } = fillEmptyWithOff(
              s.requests[month] ?? [],
              s.staff,
              month,
            );
            if (added === 0) return {};
            const requests = { ...s.requests, [month]: next };
            return { requests, ...revalidate({ ...s, requests }) };
          }),

        setStep: (step) =>
          set((s) => {
            if (step !== 4) return { currentStep: step };
            const month = s.selectedMonth;
            const { next } = fillEmptyWithOff(
              s.requests[month] ?? [],
              s.staff,
              month,
            );
            const requests = { ...s.requests, [month]: next };
            return {
              currentStep: step,
              requests,
              ...revalidate({ ...s, requests }),
            };
          }),

        setAdjustView: (view) => set({ adjustView: view }),

        focusViolation: (v) =>
          set((s) => {
            const month = v.date.slice(0, 7);
            // 月・週単位の違反は曜日ビュー、日・時間帯の違反は時間ビューで示す
            const monthLevel =
              v.rule === "WEEKLY_HOURS" ||
              v.rule === "WEEKLY_MIN_HOURS" ||
              v.rule === "WEEKLY_MIN_DAYS" ||
              v.rule === "DAYS_OFF_TARGET";
            const base = {
              currentStep: 6 as StepId,
              adjustView: monthLevel ? ("month" as const) : ("day" as const),
              selectedDate: v.date,
              highlight: {
                date: v.date,
                staffId: v.staffId,
                timeRange: v.timeRange,
                rule: v.rule,
                token: Date.now(),
              },
            };
            if (month === s.selectedMonth) return base;
            return {
              ...base,
              selectedMonth: month,
              ...revalidate({ ...s, selectedMonth: month }),
            };
          }),

        clearHighlight: () => set({ highlight: null }),

        resetSettings: () =>
          set((s) => ({
            settings: DEFAULT_SETTINGS,
            ...revalidate({ ...s, settings: DEFAULT_SETTINGS }),
          })),

        recompute: () => set((s) => revalidate(s)),

        applyShared: (doc) =>
          set((s) => {
            const settings = { ...DEFAULT_SETTINGS, ...doc.settings };
            const monthAssignments = doc.assignments[s.selectedMonth] ?? [];
            return {
              staff: doc.staff,
              settings,
              requests: doc.requests,
              assignments: doc.assignments,
              violations:
                monthAssignments.length === 0
                  ? []
                  : validateMonth(
                      s.selectedMonth,
                      doc.staff,
                      doc.requests[s.selectedMonth] ?? [],
                      monthAssignments,
                      settings,
                    ),
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
            const person = s.staff.find((st) => st.id === cmd.staffId);
            const brk = computeBreak(cmd.start, cmd.end);
            const proposed = workMinutesOf({
              startTime: cmd.start,
              endTime: cmd.end,
              breakMinutes: brk.breakMinutes,
            });
            if (exceedsDailyHourLimit(proposed, person?.maxHoursPerDay)) {
              return DAILY_HOUR_LIMIT_ALERT;
            }
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
              return `${cmd.date.slice(8)}日 は正社員3名ともシフトに入っているため、ラスト枠を空いている正社員に変更できませんでした。`;
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
            const settings = { ...DEFAULT_SETTINGS, ...s.settings, ...partial };
            return {
              settings,
              activities: [
                makeActivity("settings", "店舗設定（条件）を変更"),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, settings }),
            };
          }),

        updateStaff: (staff) =>
          set((s) => {
            const prev = s.staff.find((x) => x.id === staff.id);
            const nextStaff = s.staff.map((x) => (x.id === staff.id ? staff : x));
            const month = s.selectedMonth;
            const synced = syncStaffPatternRequests(
              s.requests[month] ?? [],
              prev,
              staff,
              month,
            );
            const requests = { ...s.requests, [month]: synced };
            return {
              staff: nextStaff,
              requests,
              activities: [
                makeActivity("staff", `${staff.name} のスタッフ情報を更新`),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, requests }),
            };
          }),

        removeStaff: (staffId) =>
          set((s) => {
            const target = s.staff.find((x) => x.id === staffId);
            if (!target) return {};
            const staff = s.staff.filter((x) => x.id !== staffId);
            const requests: Record<string, ShiftRequest[]> = {};
            for (const [month, list] of Object.entries(s.requests)) {
              requests[month] = list.filter((r) => r.staffId !== staffId);
            }
            const assignments: Record<string, ShiftAssignment[]> = {};
            for (const [month, list] of Object.entries(s.assignments)) {
              assignments[month] = list.filter((a) => a.staffId !== staffId);
            }
            const draft =
              s.draft == null
                ? null
                : {
                    ...s.draft,
                    assignments: s.draft.assignments.filter((a) => a.staffId !== staffId),
                  };
            return {
              staff,
              requests,
              assignments,
              draft,
              hiddenStaffIds: s.hiddenStaffIds.filter((id) => id !== staffId),
              activities: [
                makeActivity("staff", `${target.name} を削除`),
                ...s.activities,
              ].slice(0, MAX_ACTIVITIES),
              ...revalidate({ ...s, requests, assignments }),
            };
          }),

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

        createStore: (name) => {
          const id = `st-${Date.now().toString(36)}`;
          const month = get().selectedMonth || DEFAULT_MONTH;
          set((s) => {
            const storeBooks = { ...s.storeBooks };
            if (s.activeStoreId) storeBooks[s.activeStoreId] = packFromState(s);
            return {
              stores: [...s.stores, { id, name: name.trim() }],
              activeStoreId: id,
              storeBooks,
              issueOpen: false,
              ...unpackBook(emptyBook(month)),
              violations: [],
            };
          });
          return id;
        },

        ensureDefaultStore: () => {
          const current = get();
          const named = current.stores.find((store) => store.name === DEFAULT_STORE_NAME);
          if (named) {
            if (!current.defaultStoreSeeded) set({ defaultStoreSeeded: true });
            return named.id;
          }
          if (current.stores.length > 0 || current.defaultStoreSeeded) {
            return current.stores[0]?.id ?? "";
          }
          const id = DEFAULT_STORE_ID;
          const month = current.selectedMonth || DEFAULT_MONTH;
          set((s) => ({
            stores: [...s.stores, { id, name: DEFAULT_STORE_NAME }],
            storeBooks: {
              ...s.storeBooks,
              [id]: s.storeBooks[id] ?? emptyBook(month),
            },
            defaultStoreSeeded: true,
          }));
          return id;
        },

        deleteActiveStore: () => {
          const current = get();
          const id = current.activeStoreId;
          if (!id || !current.stores.some((store) => store.id === id)) return null;
          const storeBooks = { ...current.storeBooks };
          delete storeBooks[id];
          const stores = current.stores.filter((store) => store.id !== id);
          const nextId = stores[0]?.id ?? null;
          const month = current.selectedMonth || DEFAULT_MONTH;
          if (!nextId) {
            set({
              stores,
              storeBooks,
              defaultStoreSeeded: true,
              activeStoreId: null,
              issueOpen: false,
              ...unpackBook(emptyBook(month)),
              violations: [],
            });
            return null;
          }
          const book = storeBooks[nextId] ?? emptyBook(month);
          const unpacked = unpackBook(book);
          const monthAssignments = unpacked.assignments[unpacked.selectedMonth] ?? [];
          set({
            stores,
            storeBooks,
            defaultStoreSeeded: true,
            activeStoreId: nextId,
            issueOpen: false,
            ...unpacked,
            violations:
              monthAssignments.length === 0
                ? []
                : validateMonth(
                    unpacked.selectedMonth,
                    unpacked.staff,
                    unpacked.requests[unpacked.selectedMonth] ?? [],
                    monthAssignments,
                    unpacked.settings,
                  ),
          });
          return nextId;
        },

        selectStore: (id) =>
          set((s) => {
            if (!s.stores.some((store) => store.id === id)) return {};
            const storeBooks = { ...s.storeBooks };
            if (s.activeStoreId) storeBooks[s.activeStoreId] = packFromState(s);
            const book = storeBooks[id] ?? emptyBook(s.selectedMonth || DEFAULT_MONTH);
            const unpacked = unpackBook(book);
            const monthAssignments = unpacked.assignments[unpacked.selectedMonth] ?? [];
            return {
              activeStoreId: id,
              storeBooks,
              issueOpen: false,
              ...unpacked,
              violations:
                monthAssignments.length === 0
                  ? []
                  : validateMonth(
                      unpacked.selectedMonth,
                      unpacked.staff,
                      unpacked.requests[unpacked.selectedMonth] ?? [],
                      monthAssignments,
                      unpacked.settings,
                    ),
            };
          }),

        closeStore: () =>
          set((s) => {
            if (!s.activeStoreId) return {};
            return {
              activeStoreId: null,
              issueOpen: false,
              storeBooks: { ...s.storeBooks, [s.activeStoreId]: packFromState(s) },
            };
          }),

        setReception: (month, patch) =>
          set((s) => {
            const current = s.receptions[month] ?? {
              open: false,
              from: `${month}-01`,
              to: `${month}-28`,
            };
            return {
              receptions: {
                ...s.receptions,
                [month]: { ...current, ...patch },
              },
            };
          }),

        setBudgetHours: (hours) =>
          set((s) => ({
            budgetHours: hours,
            settings: { ...s.settings, totalLaborHoursLimit: hours },
          })),

        setIssueOpen: (open) => set({ issueOpen: open }),

        publishMonth: () =>
          set((s) => ({
            publishedMonths: s.publishedMonths.includes(s.selectedMonth)
              ? s.publishedMonths
              : [...s.publishedMonths, s.selectedMonth],
            issueOpen: false,
          })),

        reopenMonth: () =>
          set((s) => ({
            publishedMonths: s.publishedMonths.filter((month) => month !== s.selectedMonth),
            issueOpen: true,
          })),

        submitHope: (input) =>
          set((s) => {
            const target =
              s.activeStoreId === input.storeId
                ? packFromState(s)
                : (s.storeBooks[input.storeId] ?? emptyBook(input.month));
            const next = applyHopeToBook(target, input);
            if (s.activeStoreId === input.storeId) {
              return {
                ...unpackBook(next),
                ...revalidate({
                  selectedMonth: s.selectedMonth,
                  assignments: next.assignments,
                  requests: next.requests,
                  settings: next.settings,
                }),
              };
            }
            return {
              storeBooks: { ...s.storeBooks, [input.storeId]: next },
            };
          }),

        mergeRemoteBook: (storeId, remote) =>
          set((s) => {
            const local =
              s.activeStoreId === storeId
                ? packFromState(s)
                : (s.storeBooks[storeId] ?? emptyBook(remote.selectedMonth));
            const merged = mergeHopes(local, remote);
            if (!merged.changed) return {};
            if (s.activeStoreId === storeId) {
              return {
                ...unpackBook(merged.book),
                ...revalidate({
                  selectedMonth: s.selectedMonth,
                  assignments: s.assignments,
                  requests: merged.book.requests,
                  settings: s.settings,
                }),
              };
            }
            return { storeBooks: { ...s.storeBooks, [storeId]: merged.book } };
          }),

        exportBooks: () => {
          const s = get();
          const books = { ...s.storeBooks };
          if (s.activeStoreId) books[s.activeStoreId] = packFromState(s);
          const named: Record<string, StoreBook & { name: string }> = {};
          for (const store of s.stores) {
            named[store.id] = {
              ...(books[store.id] ?? emptyBook(s.selectedMonth || DEFAULT_MONTH)),
              name: store.name,
            };
          }
          return named;
        },
      };
    },
    {
      name: "shift-app-v1",
      version: 11,
      // 復元直後に違反リストを再計算（violations は永続化していないため）
      onRehydrateStorage: () => (state) => {
        state?.recompute();
      },
      migrate: (persisted, fromVersion) => {
        const p = (persisted ?? {}) as Partial<{
          staff: Staff[];
          settings: Partial<ShopSettings>;
          selectedMonth: string;
          selectedDate: string;
          sidebarCollapsed: boolean;
          hiddenStaffIds: string[];
          requests: Record<string, ShiftRequest[]>;
          assignments: Record<string, ShiftAssignment[]>;
          activities: ActivityEntry[];
        }>;
        const selectedMonth = p.selectedMonth ?? DEFAULT_MONTH;

        // v6: ダミースタッフを捨てて空から開始。希望・シフトもクリア
        const cleared = fromVersion < 6;
        // v8: 以前の初期値（週20時間・連勤3日）は未設定にする
        const staff = (cleared ? [] : (p.staff ?? [])).map((s) =>
          fromVersion < 8 && s.maxHoursPerWeek === 20 && s.maxConsecutiveDays === 3
            ? { ...s, maxHoursPerWeek: 0, maxConsecutiveDays: 0 }
            : s,
        );

        const settings = { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) };
        const requests = cleared ? {} : (p.requests ?? {});
        const assignments = cleared ? {} : (p.assignments ?? {});
        const hasLegacy = staff.length > 0 || Object.keys(requests).length > 0;
        const legacyId = "st-legacy";
        const legacyBook = emptyBook(selectedMonth);
        legacyBook.staff = staff;
        legacyBook.settings = settings;
        legacyBook.requests = requests;
        legacyBook.assignments = assignments;
        legacyBook.selectedMonth = selectedMonth;
        legacyBook.selectedDate = p.selectedDate ?? `${selectedMonth}-01`;
        legacyBook.budgetHours = settings.totalLaborHoursLimit ?? 0;
        const storeBooks: Record<string, StoreBook> = hasLegacy ? { [legacyId]: legacyBook } : {};

        return {
          staff,
          settings,
          selectedMonth,
          selectedDate: p.selectedDate ?? `${selectedMonth}-01`,
          sidebarCollapsed: p.sidebarCollapsed ?? false,
          hiddenStaffIds: cleared ? [] : (p.hiddenStaffIds ?? []),
          requests,
          assignments,
          activities: (p.activities ?? []).filter((a) => a.kind !== "login"),
          hourDefaultsMigrated: true,
          stores: hasLegacy ? [{ id: legacyId, name: "これまでの店舗" }] : [],
          activeStoreId: null,
          defaultStoreSeeded: hasLegacy,
          storeBooks,
          receptions: {},
          hopeNotes: {},
          budgetHours: settings.totalLaborHoursLimit ?? 0,
          publishedMonths: [],
          hopeStamps: {},
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
        hourDefaultsMigrated: s.hourDefaultsMigrated,
        stores: s.stores,
        activeStoreId: s.activeStoreId,
        defaultStoreSeeded: s.defaultStoreSeeded,
        storeBooks: s.storeBooks,
        receptions: s.receptions,
        hopeNotes: s.hopeNotes,
        budgetHours: s.budgetHours,
        publishedMonths: s.publishedMonths,
        hopeStamps: s.hopeStamps,
      }),
    },
  ),
);
