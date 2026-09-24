"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PrimaryButton from "@/components/PrimaryButton";
import { FieldInput } from "@/components/FieldControl";
import { useAppStore } from "@/stores/useAppStore";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startCreate = useAppStore((s) => s.startCreate);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "ログインに失敗しました");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next");
    if (next === "create" || !next || next === "/") {
      startCreate();
      router.replace("/");
    } else {
      router.replace(next);
    }
    router.refresh();
  };

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-slate-50 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4"
        aria-label="ログイン"
      >
        <h1 className="text-center text-lg font-bold text-slate-900">
          ログインしてください
        </h1>

        <FieldInput
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          required
          aria-label="パスワード"
        />

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" disabled={loading} className="w-full">
          {loading ? "確認中…" : "ログイン"}
        </PrimaryButton>
      </form>
    </main>
  );
}
