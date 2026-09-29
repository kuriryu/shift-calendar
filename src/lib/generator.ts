import type {
  ParsedConstraints,
  ShiftAssignment,
  ShiftRequest,
  ShopSettings,
  Staff,
} from "@/types";
import { daysOfMonth, formatDate, parseDate, weekKeyOf, weekdayOf } from "./dates";
import {
  businessHoursOf,
  coversSlot,
  coversSlotIncludingBreak,
  slotPlanOf,
} from "./coverage";
import {
  SLOT_MINUTES,
  exceedsDailyHourLimit,
  toMinutes,
  toTimeString,
  workMinutesOf,
} from "./time";
import { parseSpecialNote } from "./notes";
import { patternOf } from "./staff-pattern";
import { eagernessByStaff } from "./request-priority";

// 段階的ヒューリスティック:
// 1. 日単位で割当（前日までの累積状態を参照）
// 2. 希望時間の合計が多い人から順に枠を埋める。三角は最後に、空きが残った枠だけ
// 3. 社員（早番・遅番）→ 各時間帯が必要人数ちょうどになるようパート・学生で埋める
// 4. 人数が一致しない時間帯は validator がエラーとして可視化

const EMPLOYEE_SHIFT_MIN = 540; // 拘束9h = 実働8h + 休憩1h
const PART_TARGET_MIN = 240; // パート 4h 目安
const STUDENT_TARGET_MIN = 540; // 学生は日数を増やさず、1日を長く（実働8h+休憩1h）
const BREAK_THRESHOLD_MIN = 360; // 実働6h以上で休憩付与
const BREAK_MIN = 60;

type StaffState = {
  weekMinutes: number;
  weekDays: number;
  streak: number;
  workDays: number;
  offDays: number;
  lastWorkDate: string | null;
};

type Candidate = {
  staff: Staff;
  windowStart: number;
  windowEnd: number;
  /** 三角。他の人で埋まらないときだけ入れる */
  reluctant: boolean;
};

function yesterdayOf(dateStr: string): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

/** 希望（明示 > 基本パターン > 終日可）から勤務可能時間帯を求める。不可なら null */
function availabilityWindow(
  staff: Staff,
  date: string,
  request: ShiftRequest | undefined,
  open: number,
  close: number,
  note?: ParsedConstraints,
): { start: number; end: number } | null {
  if (request?.type === "off") return null;
  let win: { start: number; end: number };
  if (request?.type === "time_limited" && request.timeRange) {
    win = {
      start: toMinutes(request.timeRange.start),
      end: toMinutes(request.timeRange.end),
    };
  } else if (request?.type === "free") {
    const range = staff.freeTimeRange;
    win = range
      ? { start: toMinutes(range.start), end: toMinutes(range.end) }
      : { start: open, end: close };
    win.start = Math.max(win.start, open);
    win.end = Math.min(win.end, close);
  } else if (!request) {
    const pat = patternOf(staff, date);
    win = pat
      ? { start: toMinutes(pat.start), end: toMinutes(pat.end) }
      : { start: open, end: close };
  } else {
    // 出勤可能と三角は営業時間いっぱい。三角は後の段階で、空きが残った枠だけに入る
    win = { start: open, end: close };
  }
  // 特別な要望の時間制約で絞り込む
  if (note?.earliestStart) win.start = Math.max(win.start, toMinutes(note.earliestStart));
  if (note?.latestEnd) win.end = Math.min(win.end, toMinutes(note.latestEnd));
  return win;
}

/** 休憩の開始時刻を決める（preferred（既定14:00）開始を優先、収まらなければ中点） */
export function placeBreakStart(
  startMin: number,
  endMin: number,
  breakMinutes: number,
  preferred: number = 14 * 60,
): string {
  if (
    preferred >= startMin + 120 &&
    preferred + breakMinutes <= endMin - 60
  ) {
    return toTimeString(preferred);
  }
  const mid =
    startMin +
    Math.floor((endMin - startMin - breakMinutes) / 2 / 30) * 30;
  return toTimeString(mid);
}

/** 実働6h以上なら休憩60分を付与（手動・AI編集時の再計算用） */
export function computeBreak(
  startTime: string,
  endTime: string,
): { breakMinutes: number; breakStartTime?: string } {
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  const workMin = endMin - startMin;
  if (workMin - BREAK_MIN < BREAK_THRESHOLD_MIN) {
    return { breakMinutes: 0 };
  }
  return {
    breakMinutes: BREAK_MIN,
    breakStartTime: placeBreakStart(startMin, endMin, BREAK_MIN),
  };
}

/** 休憩を置ける開始時刻。実働が休憩ライン未満なら空 */
function legalBreakStarts(start: number, end: number): number[] {
  if (end - start - BREAK_MIN < BREAK_THRESHOLD_MIN) return [];
  const options: number[] = [];
  for (let t = start + 60; t + BREAK_MIN <= end - 60; t += SLOT_MINUTES) {
    options.push(t);
  }
  return options;
}

function alignUp(minutes: number): number {
  return Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function alignDown(minutes: number): number {
  return Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function overlapMinutes(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function breakStartOptions(a: ShiftAssignment): number[] {
  if (a.breakMinutes <= 0) return [];
  const start = toMinutes(a.startTime);
  const end = toMinutes(a.endTime);
  const len = a.breakMinutes;
  const options: number[] = [];
  for (let t = start + 60; t + len <= end - 60; t += SLOT_MINUTES) {
    options.push(t);
  }
  if (options.length > 0) return options;
  const mid =
    start + Math.floor((end - start - len) / 2 / SLOT_MINUTES) * SLOT_MINUTES;
  return mid >= start && mid + len <= end ? [mid] : [];
}

/** 休憩を動かしたときの、必要人数に対する不足スロット数 */
function breakDeficit(
  list: ShiftAssignment[],
  plan: { start: number; required: number }[],
  override?: { staffId: string; breakStartTime: string },
): number {
  return plan.reduce((sum, slot) => {
    const covered = list.filter((a) => {
      const target =
        override && a.staffId === override.staffId
          ? { ...a, breakStartTime: override.breakStartTime }
          : a;
      return coversSlot(target, slot.start);
    }).length;
    return sum + Math.max(0, slot.required - covered);
  }, 0);
}

/** 休憩中も必要人数を割らない位置へ休憩をずらす */
function repositionBreaks(
  list: ShiftAssignment[],
  plan: { start: number; required: number }[],
) {
  const withBreak = list.filter((a) => a.breakMinutes > 0 && a.breakStartTime);
  for (let pass = 0; pass < 3; pass++) {
    for (const a of withBreak) {
      const options = breakStartOptions(a);
      if (options.length === 0 || !a.breakStartTime) continue;
      let best = toMinutes(a.breakStartTime);
      let bestScore = breakDeficit(list, plan, {
        staffId: a.staffId,
        breakStartTime: a.breakStartTime,
      });
      for (const t of options) {
        const score = breakDeficit(list, plan, {
          staffId: a.staffId,
          breakStartTime: toTimeString(t),
        });
        if (score < bestScore) {
          bestScore = score;
          best = t;
        }
      }
      a.breakStartTime = toTimeString(best);
    }
  }
}

function makeAssignment(
  staff: Staff,
  date: string,
  startMin: number,
  endMin: number,
  preferredBreakMin?: number,
): ShiftAssignment {
  const workMin = endMin - startMin;
  const breakMinutes = workMin - BREAK_MIN >= BREAK_THRESHOLD_MIN ? BREAK_MIN : 0;
  return {
    id: `asg-${date}-${staff.id}`,
    staffId: staff.id,
    date,
    startTime: toTimeString(startMin),
    endTime: toTimeString(endMin),
    breakMinutes,
    breakStartTime:
      breakMinutes > 0
        ? placeBreakStart(startMin, endMin, breakMinutes, preferredBreakMin)
        : undefined,
    source: "auto",
  };
}

export function generateMonth(
  month: string,
  staffList: Staff[],
  requests: ShiftRequest[],
  settings: ShopSettings,
): ShiftAssignment[] {
  const days = daysOfMonth(month);
  const requestMap = new Map<string, ShiftRequest>();
  for (const r of requests) requestMap.set(`${r.staffId}:${r.date}`, r);
  const requestMinutes = new Map(
    [...eagernessByStaff(month, staffList, requests, settings)].map(([id, row]) => [
      id,
      row.minutes,
    ]),
  );
  const requestRank = (id: string) => requestMinutes.get(id) ?? 0;

  const state = new Map<string, StaffState>();
  for (const s of staffList) {
    state.set(s.id, {
      weekMinutes: 0,
      weekDays: 0,
      streak: 0,
      workDays: 0,
      offDays: 0,
      lastWorkDate: null,
    });
  }

  const assignments: ShiftAssignment[] = [];
  let prevWeekKey = "";

  // 特別な要望の解釈結果を事前パース
  const notesMap = new Map<string, ParsedConstraints>();
  for (const s of staffList) {
    if (s.specialNote) notesMap.set(s.id, parseSpecialNote(s.specialNote));
  }

  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    const date = days[dayIndex];
    const { open, close } = businessHoursOf(date, settings);
    const weekday = weekdayOf(date);
    const weekKey = weekKeyOf(date);
    const yesterday = yesterdayOf(date);

    // 週またぎで週次時間をリセット / 昨日休みなら連勤リセット
    for (const s of staffList) {
      const st = state.get(s.id)!;
      if (weekKey !== prevWeekKey) {
        st.weekMinutes = 0;
        st.weekDays = 0;
      }
      if (st.lastWorkDate !== yesterday) st.streak = 0;
    }
    prevWeekKey = weekKey;

    // 出勤可能な候補を構築
    const candidates: Candidate[] = [];
    for (const s of staffList) {
      const st = state.get(s.id)!;
      const note = notesMap.get(s.id);
      if (s.unavailableWeekdays?.includes(weekday)) continue;
      if (note?.unavailableWeekdays.includes(weekday)) continue;
      if (note?.onlyWeekdays && !note.onlyWeekdays.includes(weekday)) continue;
      if (note?.maxDaysPerWeek != null && st.weekDays >= note.maxDaysPerWeek)
        continue;
      if (s.maxConsecutiveDays > 0 && st.streak >= s.maxConsecutiveDays) continue;
      const request = requestMap.get(`${s.id}:${date}`);
      const win = availabilityWindow(s, date, request, open, close, note);
      if (!win) continue;
      if (win.end - win.start < 60) continue;
      candidates.push({
        staff: s,
        windowStart: win.start,
        windowEnd: win.end,
        reluctant: request?.type === "triangle",
      });
    }

    const dayAssignments: ShiftAssignment[] = [];
    const assignedToday = new Set<string>();
    const plan = slotPlanOf(date, settings);
    const coverageOf = (slotStart: number) =>
      dayAssignments.filter((a) => coversSlot(a, slotStart)).length;

    /** すでに必要人数へ達しているスロットを勤務時間に含めない範囲を探す */
    const bestWindow = (
      c: Candidate,
      targetMin: number,
      preferStart: number,
      preferEnd: number,
      preferredBreakMin?: number,
      anchor?: number,
      preferLongest = false,
      notBefore?: number,
    ): { start: number; end: number; gained: number; breakAt?: number } | null => {
      const lo = Math.max(alignUp(c.windowStart), open, notBefore ?? -Infinity);
      const hi = Math.min(alignDown(c.windowEnd), close);
      let best: {
        start: number;
        end: number;
        gained: number;
        prefer: number;
        breakAt?: number;
      } | null = null;
      for (let start = lo; start < hi; start += SLOT_MINUTES) {
        const maxEnd = Math.min(hi, start + targetMin);
        for (let end = start + SLOT_MINUTES; end <= maxEnd; end += SLOT_MINUTES) {
          const breakAts: Array<number | undefined> = preferLongest
            ? legalBreakStarts(start, end)
            : [preferredBreakMin];
          if (breakAts.length === 0) breakAts.push(preferredBreakMin);
          for (const breakAt of breakAts) {
            const draft = makeAssignment(c.staff, date, start, end, breakAt);
            if (exceedsDailyHourLimit(workMinutesOf(draft), c.staff.maxHoursPerDay))
              continue;
            const gained: number[] = [];
            let fits = true;
            for (const slot of plan) {
              if (!coversSlot(draft, slot.start)) continue;
              if (coverageOf(slot.start) >= slot.required) {
                fits = false;
                break;
              }
              gained.push(slot.start);
            }
            if (!fits || gained.length === 0) continue;
            if (anchor != null && !gained.includes(anchor)) continue;
            const prefer = overlapMinutes(start, end, preferStart, preferEnd);
            const span = end - start;
            const better = !best
              ? true
              : preferLongest
                ? span > best.end - best.start ||
                  (span === best.end - best.start &&
                    (gained.length > best.gained ||
                      (gained.length === best.gained && prefer > best.prefer)))
                : gained.length > best.gained ||
                  (gained.length === best.gained && prefer > best.prefer);
            if (better) {
              best = { start, end, gained: gained.length, prefer, breakAt };
            }
          }
        }
      }
      return best
        ? { start: best.start, end: best.end, gained: best.gained, breakAt: best.breakAt }
        : null;
    };

    const tryAssign = (
      c: Candidate,
      startMin: number,
      endMin: number,
      preferredBreakMin?: number,
    ): boolean => {
      const st = state.get(c.staff.id)!;
      const a = makeAssignment(c.staff, date, startMin, endMin, preferredBreakMin);
      const workMin = workMinutesOf(a);
      if (exceedsDailyHourLimit(workMin, c.staff.maxHoursPerDay)) return false;
      if (
        c.staff.maxHoursPerWeek > 0 &&
        st.weekMinutes + workMin > c.staff.maxHoursPerWeek * 60
      )
        return false;
      dayAssignments.push(a);
      assignedToday.add(c.staff.id);
      st.weekMinutes += workMin;
      st.weekDays += 1;
      st.streak += 1;
      st.workDays += 1;
      st.lastWorkDate = date;
      return true;
    };

    const willing = candidates.filter((c) => !c.reluctant);
    const backup = candidates.filter((c) => c.reluctant);

    // ── ① 社員: 早番・遅番を最大2名確保。三角の社員はここでは置かない ──
    const employees = willing
      .filter((c) => c.staff.role === "employee")
      .sort((a, b) => {
        // 希望時間が多い人を先に置く。同じなら出勤が少ない人、連勤が浅い人
        const byRequest = requestRank(b.staff.id) - requestRank(a.staff.id);
        if (byRequest !== 0) return byRequest;
        const sa = state.get(a.staff.id)!;
        const sb = state.get(b.staff.id)!;
        return sa.workDays - sb.workDays || sa.streak - sb.streak;
      });

    // 3名いれば1名は公休。希望が少ない人を休みにし、同じなら公休が遅れている人
    let workers = employees;
    if (employees.length >= 3) {
      const sorted = [...employees].sort((a, b) => {
        const byRequest = requestRank(a.staff.id) - requestRank(b.staff.id);
        if (byRequest !== 0) return byRequest;
        const sa = state.get(a.staff.id)!;
        const sb = state.get(b.staff.id)!;
        const needA = settings.employeeDaysOffTarget - sa.offDays;
        const needB = settings.employeeDaysOffTarget - sb.offDays;
        return needB - needA;
      });
      const rester = sorted[0];
      workers = employees.filter((c) => c.staff.id !== rester.staff.id);
    }

    const placeExact = (
      c: Candidate,
      targetMin: number,
      preferStart: number,
      preferEnd: number,
      preferredBreakMin?: number,
      anchor?: number,
      notBefore?: number,
    ) => {
      const win = bestWindow(
        c,
        targetMin,
        preferStart,
        preferEnd,
        preferredBreakMin,
        anchor,
        false,
        notBefore,
      );
      if (!win) return false;
      return tryAssign(c, win.start, win.end, win.breakAt ?? preferredBreakMin);
    };

    const [earlyEmp, lateEmp] = workers;
    if (earlyEmp) {
      placeExact(earlyEmp, EMPLOYEE_SHIFT_MIN, open, open + EMPLOYEE_SHIFT_MIN);
    }
    if (lateEmp) {
      // 早番と休憩が重ならないよう1時間ずらす
      const earlyBreak = dayAssignments.find(
        (a) => a.staffId === earlyEmp?.staff.id,
      )?.breakStartTime;
      const preferred = earlyBreak ? toMinutes(earlyBreak) + 60 : undefined;
      const defaultStart = close - EMPLOYEE_SHIFT_MIN;
      const studentWaiting = willing.some((c) => c.staff.role === "student");
      const peakStart = settings.peakHours
        .map((p) => toMinutes(p.start))
        .filter((t) => t >= open && t < defaultStart);
      const coverFrom =
        studentWaiting && peakStart.length > 0 ? Math.min(...peakStart) : undefined;
      const placed =
        coverFrom != null &&
        placeExact(
          lateEmp,
          EMPLOYEE_SHIFT_MIN,
          coverFrom,
          coverFrom + EMPLOYEE_SHIFT_MIN,
          preferred,
          coverFrom,
          coverFrom,
        );
      if (!placed) {
        placeExact(lateEmp, EMPLOYEE_SHIFT_MIN, defaultStart, close, preferred);
      }
    }

    const targetMinutes = (c: Candidate) => {
      if (c.staff.role === "employee") return EMPLOYEE_SHIFT_MIN;
      if (c.staff.role === "student") {
        const workCap =
          c.staff.maxHoursPerDay > 0
            ? c.staff.maxHoursPerDay * 60
            : STUDENT_TARGET_MIN - BREAK_MIN;
        return workCap >= BREAK_THRESHOLD_MIN ? workCap + BREAK_MIN : workCap;
      }
      return PART_TARGET_MIN;
    };

    /** まだ足りない時間帯を、必要人数を超えない範囲で埋める */
    const fillGaps = (pool: Candidate[], preferRequest: boolean) => {
      const unmet = new Set<number>();
      let guard = 0;
      while (guard++ < plan.length * Math.max(pool.length, 1) + 5) {
        const anchor = plan
          .filter((slot) => !unmet.has(slot.start) && coverageOf(slot.start) < slot.required)
          .sort(
            (a, b) =>
              b.required -
              coverageOf(b.start) -
              (a.required - coverageOf(a.start)) || a.start - b.start,
          )[0];
        if (!anchor) break;

        const minLen = (settings.minShiftHours ?? 4) * 60;
        const rows = pool
          .filter((c) => !assignedToday.has(c.staff.id))
          .map((c) => {
            const target = targetMinutes(c);
            const win = bestWindow(
              c,
              target,
              anchor.start,
              anchor.start + target,
              undefined,
              anchor.start,
              c.staff.role === "student",
            );
            return win ? { c, win } : null;
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);
        // 学生の短い枠は、他に入れる人がいないときだけ使う。
        const longEnough = rows.filter(
          (row) =>
            row.c.staff.role !== "student" || row.win.end - row.win.start >= minLen,
        );
        const ranked = (longEnough.length > 0 ? longEnough : rows).sort((a, b) => {
            const lengthRank = (row: { c: Candidate; win: { start: number; end: number } }) => {
              if (row.c.staff.role !== "student") return 0;
              return row.win.end - row.win.start >= minLen ? -1 : 1;
            };
            const byLength = lengthRank(a) - lengthRank(b);
            if (byLength !== 0) return byLength;
            if (a.c.staff.role === "student" && b.c.staff.role === "student") {
              const aLen = a.win.end - a.win.start;
              const bLen = b.win.end - b.win.start;
              if (bLen !== aLen) return bLen - aLen;
              const aState = state.get(a.c.staff.id)!;
              const bState = state.get(b.c.staff.id)!;
              return (
                aState.workDays - bState.workDays ||
                aState.weekMinutes - bState.weekMinutes
              );
            }
            if (preferRequest) {
              const byRequest = requestRank(b.c.staff.id) - requestRank(a.c.staff.id);
              if (byRequest !== 0) return byRequest;
            }
            if (b.win.gained !== a.win.gained) return b.win.gained - a.win.gained;
            if (preferRequest) {
              const remain = (c: Candidate) => {
                const st = state.get(c.staff.id)!;
                const cap =
                  c.staff.maxHoursPerWeek > 0
                    ? c.staff.maxHoursPerWeek * 60
                    : Number.POSITIVE_INFINITY;
                return cap - st.weekMinutes;
              };
              return remain(b.c) - remain(a.c);
            }
            return state.get(a.c.staff.id)!.workDays - state.get(b.c.staff.id)!.workDays;
          });

        const pick = ranked[0];
        if (!pick) {
          unmet.add(anchor.start);
          continue;
        }
        if (!tryAssign(pick.c, pick.win.start, pick.win.end, pick.win.breakAt)) {
          assignedToday.add(pick.c.staff.id);
        }
      }
    };

    // ── ② まだ足りない時間帯を、希望しているパート・学生で埋める ──
    fillGaps(
      willing.filter((c) => c.staff.role !== "employee"),
      true,
    );
    // ── ③ それでも空いている枠だけ、三角の人で埋める ──
    fillGaps(backup, false);

    // 休憩で必要人数を割る時間だけ、空いている人を短く入れる。
    // 原則2人の枠で1人が休憩に入っても、もう1人だけにならないようにする。
    const coverBreakHoles = (pool: Candidate[]) => {
      const unmet = new Set<number>();
      let guard = 0;
      while (guard++ < plan.length * Math.max(pool.length, 1) + 5) {
        const anchor = plan
          .filter((slot) => {
            if (unmet.has(slot.start) || coverageOf(slot.start) >= slot.required) {
              return false;
            }
            const present = dayAssignments.filter((a) =>
              coversSlotIncludingBreak(a, slot.start),
            ).length;
            return present >= slot.required;
          })
          .sort((a, b) => a.start - b.start)[0];
        if (!anchor) break;

        const ranked = pool
          .filter((c) => !assignedToday.has(c.staff.id))
          .map((c) => {
            const win = bestWindow(
              c,
              BREAK_MIN * 3,
              anchor.start,
              anchor.start + BREAK_MIN * 2,
              undefined,
              anchor.start,
            );
            return win ? { c, win } : null;
          })
          .filter((row): row is NonNullable<typeof row> => row !== null)
          .sort((a, b) => {
            if (b.win.gained !== a.win.gained) return b.win.gained - a.win.gained;
            const coverRank = (role: Candidate["staff"]["role"]) =>
              role === "part_time" ? 0 : role === "employee" ? 1 : 2;
            const byRole = coverRank(a.c.staff.role) - coverRank(b.c.staff.role);
            if (byRole !== 0) return byRole;
            return a.win.end - a.win.start - (b.win.end - b.win.start);
          });

        const pick = ranked[0];
        if (!pick) {
          unmet.add(anchor.start);
          continue;
        }
        if (!tryAssign(pick.c, pick.win.start, pick.win.end)) {
          assignedToday.add(pick.c.staff.id);
        }
      }
    };

    repositionBreaks(dayAssignments, plan);
    coverBreakHoles(willing);
    coverBreakHoles(backup);
    repositionBreaks(dayAssignments, plan);

    // 公休カウント（社員のみ）: 今日出勤しなかった社員
    for (const s of staffList) {
      if (s.role !== "employee") continue;
      const st = state.get(s.id)!;
      if (st.lastWorkDate !== date) st.offDays += 1;
    }

    assignments.push(...dayAssignments);
  }

  return assignments;
}
