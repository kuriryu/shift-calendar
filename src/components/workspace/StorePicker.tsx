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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center bg-[var(--ds-canvas)] px-4 py-10">
      <p className="text-xs font-bold tracking-[0.16em] text-[var(--ds-action)]">SHIFT</p>
      <h1 className="ds-title mt-2">店舗を選択</h1>
      <p className="ds-lead">店舗を選んで、その店舗のシフト希望とシフト表を開きます。</p>

      <div className="ds-card mt-6 p-5">
        <label htmlFor="store-select" className="ds-label">
          店舗
          <span className="ds-help">いま開く店舗です。最初は大井町店です。</span>
        </label>
        <select
          id="store-select"
          value={chosen}
          onChange={(event) => setSelectedId(event.target.value)}
          className="ds-input mt-2"
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
          className="ds-btn mt-4 w-full"
        >
          この店舗を開く
        </button>
      </div>

      <form onSubmit={onCreate} className="ds-card mt-4 p-5">
        <label htmlFor="store-name" className="ds-label">
          別の店舗名
          <span className="ds-help">追加した店舗は上のセレクトに並びます。</span>
        </label>
        <input
          id="store-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="ds-input mt-2"
        />
        <button type="submit" className="ds-btn-secondary mt-3 w-full">
          追加する
        </button>
      </form>
    </main>
  );
}
