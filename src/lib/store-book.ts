import type {
  HopeNote,
  ReceptionWindow,
  ShiftAssignment,
  ShiftRequest,
  ShopSettings,
  Staff,
  TimeRange,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { daysOfMonth } from "@/lib/dates";
import { toMinutes } from "@/lib/time";

export type StoreBook = {
  staff: Staff[];
  settings: ShopSettings;
  requests: Record<string, ShiftRequest[]>;
  assignments: Record<string, ShiftAssignment[]>;
  receptions: Record<string, ReceptionWindow>;
  notes: Record<string, HopeNote[]>;
  budgetHours: number;
  published: string[];
  selectedMonth: string;
  selectedDate: string;
  hopeStamps: Record<string, number>;
};

export function emptyBook(month: string): StoreBook {
  return {
    staff: [],
    settings: { ...DEFAULT_SETTINGS },
    requests: {},
    assignments: {},
    receptions: {},
    notes: {},
    budgetHours: 0,
    published: [],
    selectedMonth: month,
    selectedDate: `${month}-01`,
    hopeStamps: {},
  };
}

export function hopeKey(month: string, staffId: string): string {
  return `${month}|${staffId}`;
}

export function staffLabel(staff: Pick<Staff, "name" | "familyName">): string {
  const family = staff.familyName?.trim();
  return family && family.length > 0 ? family : staff.name;
}

export function defaultReception(month: string): ReceptionWindow {
  const days = daysOfMonth(month);
  return {
    open: false,
    from: days[0] ?? `${month}-01`,
    to: days[days.length - 1] ?? `${month}-01`,
  };
}

export function applyHopeToBook(
  book: StoreBook,
  input: {
    staffId: string;
    month: string;
    requests: ShiftRequest[];
    note: string;
    freeTime?: TimeRange;
    at?: number;
  },
): StoreBook {
  const at = input.at ?? Date.now();
  const kept = (book.requests[input.month] ?? []).filter(
    (request) => request.staffId !== input.staffId,
  );
  const requests = {
    ...book.requests,
    [input.month]: [...kept, ...input.requests],
  };
  const keptNotes = (book.notes[input.month] ?? []).filter(
    (note) => note.staffId !== input.staffId,
  );
  const message = input.note.trim();
  const notes = {
    ...book.notes,
    [input.month]: message
      ? [...keptNotes, { staffId: input.staffId, message }]
      : keptNotes,
  };
  const staff = book.staff.map((member) =>
    member.id === input.staffId
      ? {
          ...member,
          freeTimeRange: input.freeTime ?? member.freeTimeRange,
        }
      : member,
  );
  return {
    ...book,
    staff,
    requests,
    notes,
    hopeStamps: {
      ...book.hopeStamps,
      [hopeKey(input.month, input.staffId)]: at,
    },
  };
}

export function mergeHopes(
  local: StoreBook,
  remote: StoreBook,
): { book: StoreBook; changed: boolean } {
  let changed = false;
  let requests = local.requests;
  let notes = local.notes;
  const hopeStamps = { ...local.hopeStamps };
  let staff = local.staff;

  for (const [key, remoteAt] of Object.entries(remote.hopeStamps ?? {})) {
    if (remoteAt <= (hopeStamps[key] ?? 0)) continue;
    const splitAt = key.indexOf("|");
    if (splitAt < 0) continue;
    const month = key.slice(0, splitAt);
    const staffId = key.slice(splitAt + 1);
    changed = true;
    hopeStamps[key] = remoteAt;
    const kept = (requests[month] ?? []).filter((request) => request.staffId !== staffId);
    const incoming = (remote.requests[month] ?? []).filter(
      (request) => request.staffId === staffId,
    );
    requests = { ...requests, [month]: [...kept, ...incoming] };
    const keptNotes = (notes[month] ?? []).filter((note) => note.staffId !== staffId);
    const incomingNotes = (remote.notes[month] ?? []).filter(
      (note) => note.staffId === staffId,
    );
    notes = { ...notes, [month]: [...keptNotes, ...incomingNotes] };
    const remoteStaff = remote.staff.find((member) => member.id === staffId);
    if (remoteStaff?.freeTimeRange) {
      staff = staff.map((member) =>
        member.id === staffId
          ? { ...member, freeTimeRange: remoteStaff.freeTimeRange }
          : member,
      );
    }
  }

  if (!changed) return { book: local, changed: false };
  return {
    changed: true,
    book: { ...local, requests, notes, hopeStamps, staff },
  };
}
