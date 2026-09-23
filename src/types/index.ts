export type Role = "employee" | "part_time" | "student";

export type TimeRange = {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

export type Staff = {
  id: string;
  name: string;
  role: Role;
  maxHoursPerWeek: number;
  maxConsecutiveDays: number;
  monthlyDaysOffTarget: number; // 社員のみ意味を持つ（他は0）
  defaultPattern?: TimeRange; // 未入力日に自動適用される基本パターン
  unavailableWeekdays?: number[]; // 0=日 … 6=土
  note?: string;
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
  source: "auto" | "manual" | "ai";
};

export type ViolationRule =
  | "MIN_STAFF"
  | "BREAK_UNDERSTAFFED"
  | "EMPLOYEE_PRESENT"
  | "MAX_CONSECUTIVE"
  | "WEEKLY_HOURS"
  | "DAYS_OFF_TARGET"
  | "REQUEST_OFF_CONFLICT"
  | "TIME_LIMIT_CONFLICT";

export type Violation = {
  id: string;
  severity: "error" | "warning";
  rule: ViolationRule;
  date: string;
  staffId?: string;
  message: string;
};

export type ShopSettings = {
  peakHours: TimeRange[]; // ピーク時間帯（変更可能）
  normalRequired: number; // 通常の必要人数
  peakRequired: number; // ピーク時の必要人数
  strictBreakMode: boolean; // true なら休憩中の2名割れも error
};

export const DEFAULT_SETTINGS: ShopSettings = {
  peakHours: [
    { start: "11:00", end: "14:00" },
    { start: "17:00", end: "20:00" },
  ],
  normalRequired: 2,
  peakRequired: 3,
  strictBreakMode: false,
};

export const OPEN_TIME = "09:00";
export const CLOSE_WEEKDAY = "20:30"; // 日〜木
export const CLOSE_WEEKEND = "21:30"; // 金・土

export const ROLE_LABELS: Record<Role, string> = {
  employee: "社員",
  part_time: "パート",
  student: "学生",
};
