"use client";

import { useState } from "react";
import CopyHopeUrlButton from "@/components/CopyHopeUrlButton";
import Modal from "@/components/workspace/Modal";
import { hopePageUrl } from "@/lib/public-url";
import { defaultReception } from "@/lib/store-book";
import { useAppStore } from "@/stores/useAppStore";

export default function ReceptionDesk() {
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setMonth);
  const reception = useAppStore((s) => s.receptions[month]);
  const setReception = useAppStore((s) => s.setReception);
  const storeId = useAppStore((s) => s.activeStoreId);
  const exportBooks = useAppStore((s) => s.exportBooks);
  const period = reception ?? defaultReception(month);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const url = storeId ? hopePageUrl(storeId, month) : "";
  const selectMonth = (nextMonth: string) => {
    setMonth(nextMonth);
    setNotice(null);
  };

  const applyReceptionOpen = async (nextOpen: boolean) => {
    setReception(month, { open: nextOpen, from: period.from, to: period.to });
    setNotice(null);
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
    if (data.configured) {
      const missing = data.unlinked ?? [];
      const sent = data.sent ?? 0;
      setNotice(
        sent > 0
          ? `${sent}人に公式アカウントから送りました。${missing.length ? `未連携: ${missing.join("、")}` : ""}`
          : `連携済みのスタッフがいないため、送っていません。${missing.length ? `未連携: ${missing.join("、")}` : ""}`,
      );
    }
  };

  const toggleReception = () => {
    if (period.open) {
      setConfirmStop(true);
      return;
    }
    void applyReceptionOpen(true);
  };

  const confirmStopReception = () => {
    setConfirmStop(false);
    void applyReceptionOpen(false);
  };

  const inputDisabledClass =
    "disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="ds-page">
      <h1 className="ds-title">シフト希望受付</h1>
      <p className="ds-lead">
        対象の年月を選び、受付期間を決めてから募集を開始します。店舗や年月を変えると、表示されるリンクもその店舗・月用に変わります。
      </p>

      <div className="ds-card mt-6 grid max-w-xl gap-4 p-5">
        <div className="flex gap-3">
          <label className="ds-label w-32">
            年
            <select
              value={year}
              disabled={period.open}
              onChange={(event) =>
                selectMonth(`${event.target.value}-${String(monthNumber).padStart(2, "0")}`)
              }
              className={`ds-input mt-1 ${inputDisabledClass}`}
            >
              {[year - 1, year, year + 1].map((value) => (
                <option key={value} value={value}>
                  {value}年
                </option>
              ))}
            </select>
          </label>
          <label className="ds-label w-28">
            月
            <select
              value={monthNumber}
              disabled={period.open}
              onChange={(event) =>
                selectMonth(`${year}-${String(event.target.value).padStart(2, "0")}`)
              }
              className={`ds-input mt-1 ${inputDisabledClass}`}
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
          <label className="ds-label flex-1">
            募集開始
            <input
              type="date"
              value={period.from}
              disabled={period.open}
              onChange={(event) => setReception(month, { from: event.target.value })}
              className={`ds-input mt-1 ${inputDisabledClass}`}
            />
          </label>
          <label className="ds-label flex-1">
            募集終了
            <input
              type="date"
              value={period.to}
              disabled={period.open}
              onChange={(event) => setReception(month, { to: event.target.value })}
              className={`ds-input mt-1 ${inputDisabledClass}`}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={toggleReception}
          className={period.open ? "ds-btn-neutral w-full" : "ds-btn w-full"}
        >
          {period.open ? "受付を停止する" : "受付を開始する"}
        </button>

        {period.open && (
          <div className="rounded-xl bg-[#f7f7f7] p-4">
            <p className="text-xs font-bold text-[var(--ds-muted)]">希望を送るURL</p>
            <div className="mt-2">
              <CopyHopeUrlButton url={url} variant="bar" />
            </div>
          </div>
        )}

        {notice && period.open && (
          <p className="text-sm text-slate-700">{notice}</p>
        )}
      </div>

      {confirmStop && (
        <Modal title="よろしいですか？" onClose={() => setConfirmStop(false)}>
          <p>受付を解除していいですか？</p>
          <p className="mt-2 text-xs text-[var(--ds-muted)]">停止中はスタッフが希望を送れません。</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmStop(false)} className="ds-btn-neutral">
              戻る
            </button>
            <button type="button" onClick={confirmStopReception} className="ds-btn-danger-fill">
              停止する
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
