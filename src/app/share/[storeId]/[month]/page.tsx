"use client";

import { use, useEffect, useState } from "react";
import { monthLabel, weekdayLabel, daysOfMonth } from "@/lib/dates";
import { staffLabel, type StoreBook } from "@/lib/store-book";

export default function SharePage({
  params,
}: {
  params: Promise<{ storeId: string; month: string }>;
}) {
  const { storeId, month } = use(params);
  const [book, setBook] = useState<(StoreBook & { name: string }) | null>(null);

  useEffect(() => {
    fetch("/api/board")
      .then((res) => res.json())
      .then((data: { stores?: Record<string, StoreBook & { name: string }> }) => {
        setBook(data.stores?.[storeId] ?? null);
      })
      .catch(() => setBook(null));
  }, [storeId]);

  if (!book) {
    return <main className="p-8 text-sm text-slate-500">シフトを読み込んでいます…</main>;
  }

  const days = daysOfMonth(month);
  const assignments = book.assignments[month] ?? [];

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-slate-900">
        {book.name} {monthLabel(month)}のシフト
      </h1>
      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border px-2 py-1 text-left">名前</th>
            {days.map((day) => (
              <th key={day} className="border px-1 py-1">
                {Number(day.slice(8))}
                <br />
                {weekdayLabel(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {book.staff.map((member) => (
            <tr key={member.id}>
              <th className="border px-2 py-1 text-left font-medium">{staffLabel(member)}</th>
              {days.map((day) => {
                const assignment = assignments.find(
                  (item) => item.staffId === member.id && item.date === day,
                );
                return (
                  <td key={day} className="border px-1 py-1 text-center">
                    {assignment ? `${assignment.startTime}–${assignment.endTime}` : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
