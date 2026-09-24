"use client";

import HeroLanding from "@/components/HeroLanding";
import Dashboard from "@/components/Dashboard";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";

/** ヒーローとシフト作成を同一URL（/）で統合 */
export default function HomePage() {
  const mounted = useMounted();
  const createStarted = useAppStore((s) => s.createStarted);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  if (!createStarted) {
    return <HeroLanding />;
  }

  return <Dashboard />;
}
