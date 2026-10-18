"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_STORE_NAME, useAppStore } from "@/stores/useAppStore";

export default function StorePicker() {
  const router = useRouter();
  const stores = useAppStore((s) => s.stores);
  const createStore = useAppStore((s) => s.createStore);
  const selectStore = useAppStore((s) => s.selectStore);
  const [name, setName] = useState("");
  const seededId =
    stores.find((store) => store.name === DEFAULT_STORE_NAME)?.id ?? stores[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(seededId);

  useEffect(() => {
    if (selectedId && stores.some((store) => store.id === selectedId)) return;
    if (seededId) setSelectedId(seededId);
  }, [seededId, selectedId, stores]);

  const chosen =
    stores.find((store) => store.id === selectedId)?.id ??
    stores.find((store) => store.name === DEFAULT_STORE_NAME)?.id ??
    stores[0]?.id ??
    "";

  const open = (id: string) => {
    if (!id) return;
    selectStore(id);
    router.push("/dashboard");
  };

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createStore(trimmed);
    setName("");
    setSelectedId(id);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <p className="text-xs font-semibold tracking-[0.2em] text-blue-600">SHIFT</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">店舗を選択</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        店舗を選んで、その店舗のシフト希望とシフト表を開きます。
      </p>

      <label htmlFor="store-select" className="mt-8 text-sm font-medium text-slate-700">
        店舗
      </label>
      <select
        id="store-select"
        value={chosen}
        onChange={(event) => setSelectedId(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-blue-500"
      >
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => open(chosen)}
        disabled={!chosen}
        className="mt-3 h-12 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        この店舗を開く
      </button>

      <form onSubmit={onCreate} className="mt-8 flex gap-2">
        <label className="sr-only" htmlFor="store-name">
          店舗名
        </label>
        <input
          id="store-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="別の店舗を追加"
          className="h-12 flex-1 rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          追加
        </button>
      </form>
    </main>
  );
}
