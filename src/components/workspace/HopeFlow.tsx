"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StepProgress from "@/components/StepProgress";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ModalActions from "@/components/ui/ModalActions";
import Modal from "@/components/workspace/Modal";
import { monthLabel, weekdayLabel } from "@/lib/dates";
import { businessRange, monthDaysInWindow } from "@/lib/hope-hours";
import { defaultReception, staffLabel, type StoreBook } from "@/lib/store-book";
import { useAppStore } from "@/stores/useAppStore";
import type { ShiftRequest, TimeRange } from "@/types";

type Choice =
  | { kind: "free" }
  | { kind: "triangle" }
  | { kind: "off" }
  | { kind: "time"; start: string; end: string };

type Step = 1 | 2 | 3;

const HOPE_STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  1: { title: "名前", subtitle: "名字を選んでください" },
  2: { title: "希望", subtitle: "日ごとに希望を選んでください" },
  3: { title: "確認", subtitle: "内容を確認して送信してください" },
};

export default function HopeFlow({ storeId, month }: { storeId: string; month: string }) {
  const local = useLocalBook(storeId);
  const [remote, setRemote] = useState<(StoreBook & { name: string }) | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/board")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stores?: Record<string, StoreBook & { name: string }> } | null) => {
        if (cancelled) return;
        const found = data?.stores?.[storeId] ?? null;
        setRemote(found);
        setMissing(!found && !local);
      })
      .catch(() => {
        if (!cancelled) setMissing(!local);
      });
    return () => {
      cancelled = true;
    };
  }, [local, storeId]);

  const book = local ?? remote;
  if (!book) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-16 text-center text-sm text-slate-500 sm:max-w-lg sm:px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {missing ? "この募集は見つかりません。" : "読み込み中…"}
      </main>
    );
  }

  return <HopeForm storeId={storeId} month={month} book={book} />;
}

function useLocalBook(storeId: string): (StoreBook & { name: string }) | null {
  const place = useAppStore((state) => state.stores.find((store) => store.id === storeId) ?? null);
  const activeStoreId = useAppStore((state) => state.activeStoreId);
  const staff = useAppStore((state) => state.staff);
  const settings = useAppStore((state) => state.settings);
  const requests = useAppStore((state) => state.requests);
  const assignments = useAppStore((state) => state.assignments);
  const receptions = useAppStore((state) => state.receptions);
  const notes = useAppStore((state) => state.hopeNotes);
  const budgetHours = useAppStore((state) => state.budgetHours);
  const published = useAppStore((state) => state.publishedMonths);
  const selectedMonth = useAppStore((state) => state.selectedMonth);
  const selectedDate = useAppStore((state) => state.selectedDate);
  const hopeStamps = useAppStore((state) => state.hopeStamps);
  const saved = useAppStore((state) => state.storeBooks[storeId]);

  return useMemo(() => {
    if (!place) return null;
    if (activeStoreId === storeId) {
      return {
        name: place.name,
        staff,
        settings,
        requests,
        assignments,
        receptions,
        notes,
        budgetHours,
        published,
        selectedMonth,
        selectedDate,
        hopeStamps,
      };
    }
    return saved ? { ...saved, name: place.name } : null;
  }, [
    activeStoreId,
    assignments,
    budgetHours,
    hopeStamps,
    notes,
    place,
    published,
    receptions,
    requests,
    saved,
    selectedDate,
    selectedMonth,
    settings,
    staff,
    storeId,
  ]);
}

function HopeForm({
  storeId,
  month,
  book,
}: {
  storeId: string;
  month: string;
  book: StoreBook & { name: string };
}) {
  const submitHope = useAppStore((s) => s.submitHope);
  const reception = book.receptions[month] ?? defaultReception(month);
  const days = monthDaysInWindow(month, reception.from, reception.to);
  const [step, setStep] = useState<Step>(1);
  const [namePick, setNamePick] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [askEdit, setAskEdit] = useState(false);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [note, setNote] = useState("");
  const [freeRange, setFreeRange] = useState<TimeRange | null>(null);
  const [fAsks, setFAsks] = useState(0);
  const [fModal, setFModal] = useState<"ask" | "same" | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState("09:00");
  const [draftEnd, setDraftEnd] = useState("18:00");
  const [timeDate, setTimeDate] = useState<string | null>(null);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const member = book.staff.find((item) => item.id === staffId) ?? null;

  useEffect(() => {
    const node = endRef.current;
    if (!node || step !== 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setScrolledEnd(true);
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [step, days.length]);

  const summary = useMemo(
    () =>
      days.map((date) => ({
        date,
        choice: choices[date] ?? null,
      })),
    [choices, days],
  );

  if (!reception.open) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 text-center text-sm text-slate-500 sm:max-w-lg sm:px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        現在、シフト希望の受付は停止しています。
      </main>
    );
  }

  const chooseName = (id: string) => {
    const existing = (book.requests[month] ?? []).some((request) => request.staffId === id);
    setStaffId(id);
    if (existing) {
      setAskEdit(true);
      return;
    }
    setChoices({});
    setStep(2);
  };

  const loadExisting = () => {
    if (!staffId) return;
    const next: Record<string, Choice> = {};
    let range: TimeRange | null = null;
    for (const request of book.requests[month] ?? []) {
      if (request.staffId !== staffId) continue;
      if (request.type === "free") {
        next[request.date] = { kind: "free" };
        range = request.timeRange ?? range;
      } else if (request.type === "triangle") next[request.date] = { kind: "triangle" };
      else if (request.type === "off") next[request.date] = { kind: "off" };
      else if (request.type === "time_limited" && request.timeRange) {
        next[request.date] = {
          kind: "time",
          start: request.timeRange.start,
          end: request.timeRange.end,
        };
      }
    }
    const savedNote = (book.notes[month] ?? []).find((item) => item.staffId === staffId);
    setChoices(next);
    setFreeRange(range);
    setNote(savedNote?.message ?? "");
    setFAsks(range ? 2 : 0);
    setAskEdit(false);
    setStep(2);
  };

  const applyFree = (date: string, range: TimeRange) => {
    setFreeRange(range);
    setChoices((current) => ({ ...current, [date]: { kind: "free" } }));
  };

  const pick = (date: string, kind: Choice["kind"]) => {
    if (kind === "triangle" || kind === "off") {
      setChoices((current) => ({ ...current, [date]: { kind } }));
      setTimeDate(null);
      return;
    }
    if (kind === "time") {
      const hours = businessRange(date, book.settings);
      setDraftStart(hours.start);
      setDraftEnd(hours.end);
      setTimeDate(date);
      return;
    }
    setPendingDate(date);
    if (fAsks === 0) {
      const hours = businessRange(date, book.settings);
      setDraftStart(freeRange?.start ?? hours.start);
      setDraftEnd(freeRange?.end ?? hours.end);
      setFModal("ask");
      return;
    }
    if (fAsks === 1) {
      setFModal("same");
      return;
    }
    if (freeRange) applyFree(date, freeRange);
  };

  const confirmFree = () => {
    if (!pendingDate) return;
    applyFree(pendingDate, { start: draftStart, end: draftEnd });
    setFAsks((count) => (count === 0 ? 1 : 2));
    setFModal(null);
    setPendingDate(null);
  };

  const buildRequests = (): ShiftRequest[] => {
    if (!staffId) return [];
    const requests: ShiftRequest[] = [];
    for (const date of days) {
      const choice = choices[date];
      if (!choice) continue;
      if (choice.kind === "free") {
        requests.push({ staffId, date, type: "free", timeRange: freeRange ?? undefined });
      } else if (choice.kind === "triangle") {
        requests.push({ staffId, date, type: "triangle" });
      } else if (choice.kind === "off") {
        requests.push({ staffId, date, type: "off" });
      } else {
        requests.push({
          staffId,
          date,
          type: "time_limited",
          timeRange: { start: choice.start, end: choice.end },
        });
      }
    }
    return requests;
  };

  const send = async () => {
    if (!staffId) return;
    const requests = buildRequests();
    setError(null);
    submitHope({
      storeId,
      staffId,
      month,
      requests,
      note,
      freeTime: freeRange ?? undefined,
    });
    const res = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId,
        staffId,
        month,
        requests,
        note,
        freeTime: freeRange ?? undefined,
      }),
    });
    if (!res.ok && !localHasStore(storeId)) {
      setError("送信できませんでした。もう一度押してください。");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-[var(--ds-action)] px-4 text-center text-white sm:max-w-lg sm:px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <p className="text-sm font-bold">{book.name}</p>
        <h1 className="mt-2 text-2xl font-bold">送信しました</h1>
        <p className="mt-2 text-sm">{monthLabel(month)}の希望を受け付けました。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-[var(--ds-canvas)] sm:max-w-lg pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header className="bg-white px-4 pb-4 pt-6 sm:px-6">
        <p className="text-xs font-bold text-[var(--ds-action)]">{book.name}</p>
        <h1 className="text-lg font-bold text-[var(--ds-ink)] sm:text-xl">{monthLabel(month)}のシフト希望</h1>
        <div className="mt-4 flex items-center gap-4">
          <StepProgress current={step} total={3} accent="brand" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{HOPE_STEP_COPY[step].title}</h2>
            <p className="mt-1 text-sm text-slate-400">{HOPE_STEP_COPY[step].subtitle}</p>
          </div>
        </div>
      </header>

      {step === 1 && (
        <section className="px-4 py-4 sm:px-6">
          {book.staff.length === 0 ? (
            <p className="text-sm text-slate-500">スタッフが登録されていません</p>
          ) : (
            <>
              <label htmlFor="hope-name-select" className="ds-label">
                名前
                <span className="ds-help">名字を選んでください。</span>
              </label>
              <select
                id="hope-name-select"
                value={namePick}
                onChange={(event) => setNamePick(event.target.value)}
                className="ds-input mt-2"
              >
                <option value="" disabled>
                  選んでください
                </option>
                {book.staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {staffLabel(person)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={() => chooseName(namePick)}
                disabled={!namePick}
                className="mt-4 disabled:opacity-40"
                fullWidth
              >
                次へ
              </Button>
            </>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="px-4 py-4 sm:px-6">
          {summary.some((item) => item.choice?.kind === "free") && freeRange && (
            <FreeRangeEditor freeRange={freeRange} onChange={setFreeRange} className="mb-3" />
          )}
          <ul className="space-y-3">
            {days.map((date) => (
              <li key={date}>
                <Card className="p-3">
                <p className="text-sm font-bold text-slate-800">
                  {Number(date.slice(8))}日（{weekdayLabel(date)}）
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["free", "F"],
                      ["triangle", "△"],
                      ["off", "×"],
                      ["time", "時間"],
                    ] as const
                  ).map(([kind, label]) => {
                    const selected = choices[date]?.kind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => pick(date, kind)}
                        className={`min-h-12 h-12 rounded-xl text-sm font-bold ${
                          selected ? "bg-[var(--ds-action)] text-white" : "bg-[#f0f0f0] text-[var(--ds-body)]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {choices[date]?.kind === "time" && (
                  <p className="mt-2 text-xs text-slate-500">{choiceLabel(choices[date], freeRange)}</p>
                )}
                {timeDate === date && (
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="ds-label min-w-0 flex-1">
                      開始
                      <input type="time" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} className="ds-input mt-1" />
                    </label>
                    <label className="ds-label min-w-0 flex-1">
                      終了
                      <input type="time" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} className="ds-input mt-1" />
                    </label>
                    <Button
                      type="button"
                      onClick={() => {
                        setChoices((current) => ({
                          ...current,
                          [date]: { kind: "time", start: draftStart, end: draftEnd },
                        }));
                        setTimeDate(null);
                      }}
                      className="w-full px-4 sm:w-auto sm:shrink-0"
                    >
                      決定
                    </Button>
                  </div>
                )}
                </Card>
              </li>
            ))}
          </ul>
          <div ref={endRef} className="h-8" />
          {scrolledEnd && (
            <Card className="sticky bottom-0 z-10 mt-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-4">
              <Button
                type="button"
                onClick={() => setStep(3)}
                disabled={days.some((date) => !choices[date])}
                fullWidth
                className="disabled:opacity-40"
              >
                確認へ
              </Button>
            </Card>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-slate-900">これでいいですか？</h2>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {summary.map((item) => (
              <li
                key={item.date}
                className="flex flex-col gap-1 border-b border-slate-100 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
              >
                <span className="shrink-0 font-medium text-slate-800">
                  {Number(item.date.slice(8))}日（{weekdayLabel(item.date)}）
                </span>
                <span className="text-slate-600 sm:text-right">{choiceLabel(item.choice, freeRange)}</span>
              </li>
            ))}
          </ul>
          <label className="ds-label mt-4">
            特別なリクエスト
            <span className="ds-help">休みたい日や用事があれば書いてください。</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="ds-input mt-2"
            />
          </label>
          {error && <p className="mt-2 text-sm text-[#e0002e]">{error}</p>}
          <Button type="button" onClick={() => void send()} className="mt-4" fullWidth>
            送信する
          </Button>
        </section>
      )}

      {askEdit && (
        <Modal title="すでに提出済みです">
          <p>再度編集しますか？</p>
          <ModalActions
            cancelLabel="いいえ"
            onCancel={() => {
              setAskEdit(false);
              setStaffId(null);
            }}
            onConfirm={loadExisting}
            confirmLabel="はい"
          />
        </Modal>
      )}

      {fModal === "ask" && (
        <Modal title="Fの時間">
          <p>何時から何時をFとしますか？</p>
          <div className="mt-3 flex gap-2">
            <label className="ds-label flex-1">
              開始
              <input type="time" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} className="ds-input mt-1" />
            </label>
            <label className="ds-label flex-1">
              終了
              <input type="time" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} className="ds-input mt-1" />
            </label>
          </div>
          <Button type="button" onClick={confirmFree} className="mt-4" fullWidth>
            この時間にする
          </Button>
        </Modal>
      )}

      {fModal === "same" && (
        <Modal title="Fの時間">
          <p>前回の指定と同じままでいいですか？</p>
          <p className="mt-1 font-semibold text-slate-800">
            {freeRange ? `${freeRange.start}–${freeRange.end}` : ""}
          </p>
          <ModalActions
            cancelLabel="変える"
            onCancel={() => {
              setFModal("ask");
            }}
            onConfirm={() => {
              if (pendingDate && freeRange) applyFree(pendingDate, freeRange);
              setFAsks(2);
              setFModal(null);
              setPendingDate(null);
            }}
            confirmLabel="同じでいい"
          />
        </Modal>
      )}
    </main>
  );
}

function FreeRangeEditor({
  freeRange,
  onChange,
  className = "",
}: {
  freeRange: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}) {
  return (
    <Card className={`p-3 ${className}`.trim()}>
      <label className="ds-label">
        Fの時間
        <span className="ds-help">Fにした日は、この時間帯で希望します。</span>
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="ds-label min-w-0 flex-1">
          開始
          <input
            type="time"
            value={freeRange.start}
            onChange={(event) => onChange({ start: event.target.value, end: freeRange.end })}
            className="ds-input mt-1"
          />
        </label>
        <label className="ds-label min-w-0 flex-1">
          終了
          <input
            type="time"
            value={freeRange.end}
            onChange={(event) => onChange({ start: freeRange.start, end: event.target.value })}
            className="ds-input mt-1"
          />
        </label>
      </div>
    </Card>
  );
}

function localHasStore(storeId: string): boolean {
  return useAppStore.getState().stores.some((store) => store.id === storeId);
}

function choiceLabel(choice: Choice | null, freeRange: TimeRange | null): string {
  if (!choice) return "未選択";
  if (choice.kind === "free") return freeRange ? `F ${freeRange.start}–${freeRange.end}` : "F";
  if (choice.kind === "triangle") return "△";
  if (choice.kind === "off") return "×";
  return `${choice.start}–${choice.end}`;
}
