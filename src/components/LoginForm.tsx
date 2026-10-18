"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PrimaryButton from "@/components/PrimaryButton";
import Card from "@/components/ui/Card";
import FieldControl, { FieldInput } from "@/components/FieldControl";
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
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-[var(--ds-canvas)] px-4 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm" aria-label="ログイン">
        <Card className="space-y-4 p-6">
        <h1 className="ds-title text-center">ログインしてください</h1>
        <FieldControl id="login-password" label="パスワード" required>
          <FieldInput
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FieldControl>

        {error && (
          <p role="alert" className="text-sm text-[#e0002e]">
            {error}
          </p>
        )}

        <PrimaryButton type="submit" disabled={loading} className="w-full">
          {loading ? "確認中…" : "ログイン"}
        </PrimaryButton>
        </Card>
      </form>
    </main>
  );
}
