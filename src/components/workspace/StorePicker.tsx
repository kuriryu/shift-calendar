"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/useAppStore";

export default function StorePicker() {
  const router = useRouter();
  const stores = useAppStore((s) => s.stores);
  const createStore = useAppStore((s) => s.createStore);
  const selectStore = useAppStore((s) => s.selectStore);
  const [name, setName] = useState("");

  const open = (id: string) => {
    selectStore(id);
    router.push("/dashboard");
  };

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createStore(trimmed);
    setName("");
    router.push("/dashboard");
    void id;
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] text-blue-600">SHIFT</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">店舗を選択</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        店舗ごとにシフト希望の受付とシフト表を分けます。
      </p>

      <form onSubmit={onCreate} className="mt-8 flex gap-2">
        <label className="sr-only" htmlFor="store-name">
          店舗名
        </label>
        <input
          id="store-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="店舗名"
          className="h-12 flex-1 rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="h-12 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          追加
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {stores.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
            まだ店舗がありません
          </li>
        )}
        {stores.map((store) => (
          <li key={store.id}>
            <button
              type="button"
              onClick={() => open(store.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm hover:border-blue-300"
            >
              <span className="text-lg font-semibold text-slate-900">{store.name}</span>
              <span className="text-sm font-medium text-blue-600">開く</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
