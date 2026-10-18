"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/useAppStore";
import type { StoreBook } from "@/lib/store-book";

export default function BoardSync() {
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const exportBooks = useAppStore((s) => s.exportBooks);
  const mergeRemoteBook = useAppStore((s) => s.mergeRemoteBook);
  const staff = useAppStore((s) => s.staff);
  const requests = useAppStore((s) => s.requests);
  const receptions = useAppStore((s) => s.receptions);
  const settings = useAppStore((s) => s.settings);
  const assignments = useAppStore((s) => s.assignments);
  const hopeNotes = useAppStore((s) => s.hopeNotes);
  const budgetHours = useAppStore((s) => s.budgetHours);
  const publishedMonths = useAppStore((s) => s.publishedMonths);
  const stores = useAppStore((s) => s.stores);
  const hopeStamps = useAppStore((s) => s.hopeStamps);

  useEffect(() => {
    if (!activeStoreId) return;
    let cancelled = false;

    const push = async () => {
      await fetch("/api/board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stores: exportBooks() }),
      });
    };

    const pull = async () => {
      const res = await fetch("/api/board");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { stores?: Record<string, StoreBook> };
      const remote = data.stores?.[activeStoreId];
      if (remote) mergeRemoteBook(activeStoreId, remote);
    };

    const pushTimer = window.setTimeout(() => {
      void push();
    }, 400);
    const pullTimer = window.setInterval(() => {
      void pull();
    }, 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(pushTimer);
      window.clearInterval(pullTimer);
    };
  }, [
    activeStoreId,
    assignments,
    budgetHours,
    exportBooks,
    hopeNotes,
    hopeStamps,
    mergeRemoteBook,
    publishedMonths,
    receptions,
    requests,
    settings,
    staff,
    stores,
  ]);

  return null;
}
