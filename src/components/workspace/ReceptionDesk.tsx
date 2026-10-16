"use client";

import { monthLabel } from "@/lib/dates";
import { defaultReception } from "@/lib/store-book";
import { useAppStore } from "@/stores/useAppStore";

export default function ReceptionDesk() {
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const reception = useAppStore((s) => s.receptions[month]);
  const setReception = useAppStore((s) => s.setReception);
  const storeId = useAppStore((s) => s.activeStoreId);
  const storeName = useAppStore(
    (s) => s.stores.find((store) => store.id === s.activeStoreId)?.name ?? "店舗",
  );
  const period = reception ?? defaultReception(month);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const path = storeId ? `/hope/${storeId}/${month}` : "";
  const url = typeof location === "undefined" ? path : `${location.origin}${path}`;

  const shareLine = () => {
    const text = `${storeName}の${monthLabel(month)}シフト希望を募集します。\n${url}\n期間: ${period.from} から ${period.to}`;
    const shareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    globalThis.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="h-full overflow-auto p-5 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">シフト希望受付</h1>
      <p className="mt-2 text-sm text-slate-500">
        対象の年月を選び、受付期間を決めてから募集を開始します。開始すると LINE でスタッフへリンクを送れます。
      </p>

      <div className="mt-6 grid max-w-xl gap-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <label className="flex-1 text-sm text-slate-500">
            年
            <select
              value={year}
              onChange={(event) =>
                setMonth(`${event.target.value}-${String(monthNumber).padStart(2, "0")}`)
              }
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900"
            >
              {[year - 1, year, year + 1].map((value) => (
                <option key={value} value={value}>
                  {value}年
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-sm text-slate-500">
            月
            <select
              value={monthNumber}
              onChange={(event) =>
                setMonth(`${year}-${String(event.target.value).padStart(2, "0")}`)
              }
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}月
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex gap-3">
          <label className="flex-1 text-sm text-slate-500">
            募集開始
            <input
              type="date"
              value={period.from}
              onChange={(event) => setReception(month, { from: event.target.value })}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900"
            />
          </label>
          <label className="flex-1 text-sm text-slate-500">
            募集終了
            <input
              type="date"
              value={period.to}
              onChange={(event) => setReception(month, { to: event.target.value })}
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-base text-slate-900"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => setReception(month, { open: !period.open, from: period.from, to: period.to })}
          className={`h-12 rounded-xl text-sm font-semibold text-white ${
            period.open ? "bg-slate-700" : "bg-blue-600"
          }`}
        >
          {period.open ? "受付を停止する" : "シフト希望の受付を開始する"}
        </button>

        {period.open && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-400">発行済みのURL</p>
            <p className="mt-1 break-all text-sm text-slate-800">{url}</p>
            <button
              type="button"
              onClick={shareLine}
              className="mt-3 h-11 rounded-full bg-[#06C755] px-4 text-sm font-semibold text-white"
            >
              LINEで連絡する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
