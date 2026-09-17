export type ShiftKind = "work" | "off";

export type ShiftEntry = {
  staff: string;
  kind: ShiftKind;
  time?: string;
};

const STAFF = ["Aさん", "Bさん", "Cさん", "Dさん"] as const;

const WORK_SLOTS = ["09:00-18:00", "10:00-19:00", "13:00-22:00"] as const;

export function getMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: Array<{ date: Date; inMonth: boolean }> = [];

  for (let i = 0; i < startWeekday; i++) {
    const date = new Date(year, monthIndex, i - startWeekday + 1);
    cells.push({ date, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, monthIndex, day), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const date = new Date(last);
    date.setDate(date.getDate() + 1);
    cells.push({ date, inMonth: false });
  }

  return cells;
}

export function getDummyShifts(date: Date): ShiftEntry[] {
  const day = date.getDate();
  const weekday = date.getDay();

  return STAFF.map((staff, index) => {
    const rotation = (day + index) % 5;

    if (weekday === 0 && index >= 2) {
      return { staff, kind: "off" };
    }

    if (rotation === 0) {
      return { staff, kind: "off" };
    }

    return {
      staff,
      kind: "work",
      time: WORK_SLOTS[(day + index) % WORK_SLOTS.length],
    };
  });
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
