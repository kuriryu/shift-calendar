export type Role = "employee" | "part_time" | "student";

export type TimeRange = {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

export type Staff = {
  id: string;
  name: string;
  role: Role;
  /** 週の上限時間。0 は未設定（上限チェックなし） */
  maxHoursPerWeek: number;
  /** 最大連勤日数。0 は未設定（連勤チェックなし） */
  maxConsecutiveDays: number;
  /** 1か月あたりの希望勤務日数。未設定は undefined */
  desiredWorkDays?: number;
  /** 1か月あたりの希望勤務時間。未設定は undefined */
  desiredMonthlyHours?: number;
  monthlyDaysOffTarget: number; // 社員のみ意味を持つ（他は0）
  /** @deprecated 平日・土日パターンへ移行。マイグレーション用に残す */
  defaultPattern?: TimeRange;
  /** 平日（月〜金）の基本パターン。未入力日に自動適用 */
  weekdayPattern?: TimeRange;
  /** 休日（土・日）の基本パターン。未入力日に自動適用 */
  weekendPattern?: TimeRange;
  unavailableWeekdays?: number[]; // 0=日 … 6=土
  specialNote?: string; // 特別な要望（自由テキスト。AIが解釈して生成に反映）
  note?: string;
};

/** 特別な要望テキストの解釈結果 */
export type ParsedConstraints = {
  unavailableWeekdays: number[]; // 「水曜は休み」
  onlyWeekdays: number[] | null; // 「土日のみ」
  earliestStart?: string; // 「10時から」
  latestEnd?: string; // 「17時まで」
  maxDaysPerWeek?: number; // 「週2日まで」
  summary: string[]; // 解釈結果の人間向け表示
};

/** ログイン・編集などの活動履歴 */
export type ActivityEntry = {
  id: string;
  at: string; // ISO 8601
  kind: "login" | "generate" | "manual" | "ai" | "request" | "staff" | "settings";
  message: string;
};

export type RequestType = "available" | "off" | "time_limited";

export type ShiftRequest = {
  staffId: string;
  date: string; // YYYY-MM-DD
  type: RequestType;
  timeRange?: TimeRange; // type === "time_limited" のとき
};

export type ShiftAssignment = {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  breakMinutes: number;
  breakStartTime?: string; // 休憩開始 "HH:MM"（カウント精度のため保持）
  /** 早番・中番・遅番、または自由入力の勤務帯 */
  shiftSlot?: string;
  source: "auto" | "manual" | "ai";
};

export type ViolationRule =
  | "MIN_STAFF"
  | "BREAK_UNDERSTAFFED"
  | "EMPLOYEE_PRESENT"
  | "MAX_CONSECUTIVE"
  | "WEEKLY_HOURS"
  | "WEEKLY_MIN_HOURS"
  | "WEEKLY_MIN_DAYS"
  | "DAYS_OFF_TARGET"
  | "REQUEST_OFF_CONFLICT"
  | "TIME_LIMIT_CONFLICT";

export type Violation = {
  id: string;
  severity: "error" | "warning";
  rule: ViolationRule;
  date: string;
  staffId?: string;
  /** 時間帯に関する違反（人員不足など）の該当時間帯。ハイライト表示に使う */
  timeRange?: TimeRange;
  message: string;
};

export type ShopSettings = {
  openTime: string; // 開店時刻 "HH:MM"
  closeTimeWeekday: string; // 閉店時刻（日〜木）
  closeTimeWeekend: string; // 閉店時刻（金・土）
  peakHours: TimeRange[]; // ピーク時間帯（変更可能）
  normalRequired: number; // 原則の必要人数
  peakRequired: number; // ピーク時の必要人数
  edgeRequired: number; // 開店・閉店（締め作業）時の必須人数
  employeeDaysOffTarget: number; // 社員の月間休日目標（日）
  employeeMinHoursPerWeek: number; // 社員の週最低労働時間
  employeeMinDaysPerWeek: number; // 社員の週最低出勤日数
};

export const OPEN_TIME = "09:00";
export const CLOSE_WEEKDAY = "20:30"; // 日〜木
export const CLOSE_WEEKEND = "21:30"; // 金・土

export const DEFAULT_SETTINGS: ShopSettings = {
  openTime: OPEN_TIME,
  closeTimeWeekday: CLOSE_WEEKDAY,
  closeTimeWeekend: CLOSE_WEEKEND,
  peakHours: [
    { start: "11:00", end: "14:00" },
    { start: "17:00", end: "20:00" },
  ],
  normalRequired: 2,
  peakRequired: 3,
  edgeRequired: 2,
  employeeDaysOffTarget: 9,
  employeeMinHoursPerWeek: 32,
  employeeMinDaysPerWeek: 4,
};

/** シフト作成フローのステップ番号 */
export type StepId = 1 | 2 | 3 | 4 | 5 | 6;

/** 違反箇所のハイライト対象 */
export type HighlightTarget = {
  date: string;
  staffId?: string;
  timeRange?: TimeRange;
  rule: ViolationRule;
  /** 同じ違反を続けてクリックしても再ハイライトされるようにする識別子 */
  token: number;
};

export const ROLE_LABELS: Record<Role, string> = {
  employee: "社員",
  part_time: "パート",
  student: "学生",
};
