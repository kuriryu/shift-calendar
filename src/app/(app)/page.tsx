"use client";

import { useEffect } from "react";
import HeroLanding from "@/components/HeroLanding";
import Dashboard from "@/components/Dashboard";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";
import { useRouter } from "next/navigation";

/** ヒーローとシフト作成を同一URL（/）で統合。作成開始にはログイン必須 */
export default function HomePage() {
  const mounted = useMounted();
  const router = useRouter();
  const createStarted = useAppStore((s) => s.createStarted);
  const showHero = useAppStore((s) => s.showHero);

  useEffect(() => {
    if (!mounted || !createStarted) return;
    let cancelled = false;
    fetch("/api/auth/me").then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        showHero();
        router.replace("/login?next=create");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, createStarted, showHero, router]);

  if (!mounted) {
    return <div className="py-20 text-center text-sm text-slate-400">読み込み中…</div>;
  }

  if (!createStarted) {
    return <HeroLanding />;
  }

  return <Dashboard />;
}
