import { getDummyShifts, getMonthGrid, isSameDay } from "@/lib/shifts";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const STAFF_STYLES: Record<string, string> = {
  Aさん: "bg-sky-50 text-sky-800 ring-sky-100",
  Bさん: "bg-violet-50 text-violet-800 ring-violet-100",
  Cさん: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  Dさん: "bg-amber-50 text-amber-800 ring-amber-100",
};

export default function ShiftCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const monthIndex = today.getMonth();
  const cells = getMonthGrid(year, monthIndex);
  const monthLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(new Date(year, monthIndex, 1));

  return (
    <section className="flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-slate-500">
            シフト管理
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {monthLabel}
          </h1>
        </div>
        <ul className="flex flex-wrap gap-2 text-xs text-slate-600">
          {Object.keys(STAFF_STYLES).map((staff) => (
            <li
              key={staff}
              className={`rounded-full px-3 py-1 font-medium ring-1 ${STAFF_STYLES[staff]}`}
            >
              {staff}
            </li>
          ))}
        </ul>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAYS.map((label, index) => (
            <div
              key={label}
              className={`px-3 py-3 text-center text-sm font-semibold ${
                index === 0
                  ? "text-rose-500"
                  : index === 6
                    ? "text-sky-600"
                    : "text-slate-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {cells.map(({ date, inMonth }) => {
            const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const weekday = date.getDay();
            const todayCell = inMonth && isSameDay(date, today);
            const shifts = inMonth ? getDummyShifts(date) : [];

            return (
              <div
                key={key}
                className={`min-h-36 border-t border-slate-100 p-2 ${
                  weekday !== 6 ? "border-r" : ""
                } ${inMonth ? "bg-white" : "bg-slate-50/70"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      todayCell
                        ? "bg-slate-900 text-white"
                        : weekday === 0 && inMonth
                          ? "text-rose-500"
                          : weekday === 6 && inMonth
                            ? "text-sky-600"
                            : inMonth
                              ? "text-slate-700"
                              : "text-slate-300"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {todayCell ? (
                    <span className="text-[10px] font-medium tracking-wide text-slate-400">
                      今日
                    </span>
                  ) : null}
                </div>

                <ul className="space-y-1">
                  {shifts.map((shift) => (
                    <li
                      key={`${key}-${shift.staff}`}
                      className={`truncate rounded-md px-1.5 py-1 text-[11px] leading-tight ring-1 ring-inset ${
                        shift.kind === "off"
                          ? "bg-slate-50 text-slate-400 ring-slate-100"
                          : STAFF_STYLES[shift.staff]
                      }`}
                    >
                      <span className="font-medium">{shift.staff}</span>{" "}
                      <span className="font-normal">
                        {shift.kind === "off" ? "休み" : shift.time}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
