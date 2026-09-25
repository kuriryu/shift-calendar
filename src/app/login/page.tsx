"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { LOGIN_ENABLED } from "@/lib/auth/feature";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (!LOGIN_ENABLED) router.replace("/");
  }, [router]);

  if (!LOGIN_ENABLED) return null;

  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-sm text-slate-400">
          読み込み中…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
