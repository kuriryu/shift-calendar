"use client";

import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/useAppStore";

export default function SignOutButton() {
  const router = useRouter();
  const showHero = useAppStore((s) => s.showHero);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    showHero();
    router.replace("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      ログアウト
    </button>
  );
}
