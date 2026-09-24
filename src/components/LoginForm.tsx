"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import PrimaryButton from "@/components/PrimaryButton";
import FieldControl, { FieldInput } from "@/components/FieldControl";
import { useAppStore } from "@/stores/useAppStore";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startCreate = useAppStore((s) => s.startCreate);
  const [email, setEmail] = useState("");
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
      body: JSON.stringify({ email, password }),
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
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <BrandMark size="lg" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">ログイン</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            管理者から事前に発行されたパスワードを入力してください。
            新規登録はできません。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldControl id="login-email" label="メールアドレス" required>
            <FieldInput
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="store@example.com"
              required
            />
          </FieldControl>

          <FieldControl
            id="login-password"
            label="発行パスワード"
            required
            hint="事前にお渡ししたパスワード"
          >
            <FieldInput
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="発行されたパスワード"
              required
            />
          </FieldControl>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? "確認中…" : "ログインして始める"}
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
