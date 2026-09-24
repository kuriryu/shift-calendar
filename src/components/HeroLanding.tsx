"use client";

import BrandMark from "@/components/BrandMark";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppStore } from "@/stores/useAppStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** ランディングヒーロー。作成開始にはログイン（発行パスワード）が必要 */
export default function HeroLanding() {
  const router = useRouter();
  const startCreate = useAppStore((s) => s.startCreate);
  const [checking, setChecking] = useState(false);

  const handleStart = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        startCreate();
        return;
      }
      router.push("/login?next=create");
    } catch {
      router.push("/login?next=create");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="flex min-h-dvh flex-1 flex-col overflow-hidden bg-slate-50 md:min-h-full">
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-6 px-5 py-8 md:grid-cols-2 md:gap-16 md:px-6 md:py-28">
        <div className="hero-fade text-center md:text-left">
          <div className="mb-4 flex justify-center md:mb-6 md:justify-start">
            <BrandMark size="lg" />
          </div>
          <span className="inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium tracking-wide text-blue-600">
            シフト管理
          </span>
          <h1 className="mt-4 text-[1.75rem] font-semibold leading-snug tracking-tight text-slate-800 sm:text-4xl md:mt-6 lg:text-5xl">
            シフトの事務作業を、
            <br />
            スマートに。
          </h1>
          <p className="hero-fade-delay mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-lg md:mx-0 md:mt-5 md:text-base">
            希望の収集からシフト作成まで。面倒な作業を減らし、現場の時間を戻します。
          </p>
          <div className="mt-5 flex justify-center md:mt-8 md:justify-start">
            <PrimaryButton onClick={handleStart} disabled={checking}>
              {checking ? "確認中…" : "シフトを作成する"}
            </PrimaryButton>
          </div>
        </div>

        <div
          className="relative mx-auto aspect-square w-full max-h-[min(42dvh,280px)] max-w-[280px] [perspective:1200px] md:max-h-none md:max-w-none"
          aria-hidden
        >
          <div className="hero-aura pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/50 blur-3xl" />
          <div
            className="hero-aura pointer-events-none absolute right-6 top-8 h-56 w-56 rounded-full bg-blue-400/40 blur-3xl"
            style={{ animationDelay: "1.4s" }}
          />
          <div
            className="hero-aura pointer-events-none absolute bottom-6 left-8 h-48 w-48 rounded-full bg-sky-300/40 blur-3xl"
            style={{ animationDelay: "2.6s" }}
          />

          <div className="hero-tilt-slow relative z-10 flex h-full w-full items-center justify-center">
            <div
              className="hero-float-slow relative w-[78%] rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-xl shadow-slate-300/40 backdrop-blur-md"
              style={{ transform: "rotateX(12deg) rotateY(-18deg)" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                <div className="flex -space-x-2">
                  <span className="h-6 w-6 rounded-full border-2 border-white bg-blue-500" />
                  <span className="h-6 w-6 rounded-full border-2 border-white bg-cyan-400" />
                  <span className="h-6 w-6 rounded-full border-2 border-white bg-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-blue-50 p-3">
                  <div className="flex h-full items-end gap-1.5">
                    <span className="h-[40%] w-3 rounded-sm bg-blue-300" />
                    <span className="h-[70%] w-3 rounded-sm bg-blue-500" />
                    <span className="h-[55%] w-3 rounded-sm bg-cyan-400" />
                    <span className="h-[85%] w-3 rounded-sm bg-blue-600" />
                    <span className="h-[48%] w-3 rounded-sm bg-slate-300" />
                  </div>
                </div>
                <div className="flex h-24 flex-col justify-between rounded-2xl bg-slate-800 p-3 text-white">
                  <span className="text-[10px] text-slate-300">稼働率</span>
                  <span className="text-lg font-semibold">96%</span>
                </div>
              </div>
            </div>

            <div
              className="hero-float-slow absolute -left-1 top-8 z-20 w-36 rounded-2xl border border-white/80 bg-white/70 p-3 shadow-lg backdrop-blur-md"
              style={{ animationDelay: "0.8s" }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-blue-600" />
                <div>
                  <div className="h-2 w-14 rounded-full bg-slate-300" />
                  <div className="mt-1 h-1.5 w-10 rounded-full bg-slate-200" />
                </div>
              </div>
              <div className="h-10 rounded-lg bg-gradient-to-r from-cyan-100 to-blue-100" />
            </div>

            <div
              className="hero-float-slow absolute -right-2 bottom-10 z-20 w-40 rounded-2xl border border-white/80 bg-white/75 p-3 shadow-lg backdrop-blur-md"
              style={{ animationDelay: "1.6s" }}
            >
              <div className="mb-2 h-2 w-16 rounded-full bg-slate-300" />
              <div className="flex h-14 items-end gap-1">
                <span className="h-[30%] flex-1 rounded-sm bg-slate-200" />
                <span className="h-[60%] flex-1 rounded-sm bg-blue-400" />
                <span className="h-[45%] flex-1 rounded-sm bg-cyan-300" />
                <span className="h-[80%] flex-1 rounded-sm bg-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
