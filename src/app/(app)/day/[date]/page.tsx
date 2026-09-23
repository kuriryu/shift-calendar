"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/useAppStore";

/** 旧URL (/day/YYYY-MM-DD) はトップの時間ビューに統合されたためリダイレクト */
export default function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = use(params);
  const router = useRouter();
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  useEffect(() => {
    setSelectedDate(date);
    router.replace("/");
  }, [date, router, setSelectedDate]);

  return (
    <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>
  );
}
