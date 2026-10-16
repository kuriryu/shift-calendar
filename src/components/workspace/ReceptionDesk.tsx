"use client";

import { useEffect, useState } from "react";
import { defaultReception, staffLabel } from "@/lib/store-book";
import { useAppStore } from "@/stores/useAppStore";

export default function ReceptionDesk() {
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const reception = useAppStore((s) => s.receptions[month]);
  const setReception = useAppStore((s) => s.setReception);
  const storeId = useAppStore((s) => s.activeStoreId);
  const staff = useAppStore((s) => s.staff);
  const exportBooks = useAppStore((s) => s.exportBooks);
  const period = reception ?? defaultReception(month);
  const [lineReady, setLineReady] = useState<boolean | null>(null);
  const [addFriendUrl, setAddFriendUrl] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<string | null>(null);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const path = storeId ? `/hope/${storeId}/${month}` : "";
  const url = typeof location === "undefined" ? path : `${location.origin}${path}`;
  const linked = staff.filter((member) => member.lineUserId);
  const unlinked = staff.filter((member) => !member.lineUserId);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/line/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { configured?: boolean; addFriendUrl?: string | null } | null) => {
        if (cancelled || !data) return;
        setLineReady(Boolean(data.configured));
        setAddFriendUrl(data.addFriendUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setLineReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleReception = async () => {
    const nextOpen = !period.open;
    setReception(month, { open: nextOpen, from: period.from, to: period.to });
    setDelivery(null);
    if (!nextOpen || !storeId) return;
    await fetch("/api/board", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stores: exportBooks() }),
    });
    const res = await fetch("/api/line/recruit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, month }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      configured?: boolean;
      sent?: number;
      unlinked?: string[];
      error?: string;
    };
    if (!res.ok && data.error) {
      setDelivery(data.error);
      return;
    }
    if (!data.configured) {
      setDelivery("公式アカウントが未接続のため、自動配信はまだできません。");
      return;
    }
    const missing = data.unlinked ?? [];
    const sent = data.sent ?? 0;
    setDelivery(
      sent > 0
        ? `${sent}人に公式アカウントから送りました。${missing.length ? `未連携: ${missing.join("、")}` : ""}`
        : `連携済みのスタッフがいないため、送っていません。${missing.length ? `未連携: ${missing.join("、")}` : ""}`,
    );
  };

  return (
    <div className="h-full overflow-auto p-5 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900">シフト希望受付</h1>
      <p className="mt-2 text-sm text-slate-500">
        対象の年月を選び、受付期間を決めてから募集を開始します。開始すると、連携済みのスタッフへ公式アカウントから希望URLを送ります。
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
          onClick={() => void toggleReception()}
          className={`h-12 rounded-xl text-sm font-semibold text-white ${
            period.open ? "bg-slate-700" : "bg-blue-600"
          }`}
        >
          {period.open ? "受付を停止する" : "シフト希望の受付を開始する"}
        </button>

        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="text-xs font-semibold text-slate-400">LINE公式アカウント</p>
          {lineReady === false && (
            <p className="mt-2">
              チャネルが未接続です。接続後、受付開始と同時に連携済みのスタッフへ自動で届きます。
            </p>
          )}
          {lineReady && (
            <p className="mt-2">
              接続済みです。連携 {linked.length} 人 / 未連携 {unlinked.map((member) => staffLabel(member)).join("、") || "なし"}
            </p>
          )}
          {addFriendUrl && (
            <a href={addFriendUrl} className="mt-2 inline-block font-semibold text-[#06C755]" target="_blank" rel="noreferrer">
              友達追加して名前を送る
            </a>
          )}
          {delivery && <p className="mt-2">{delivery}</p>}
        </div>

        {period.open && (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-400">発行済みのURL</p>
            <p className="mt-1 break-all text-sm text-slate-800">{url}</p>
          </div>
        )}
      </div>
    </div>
  );
}
