"use client";

import { useEffect } from "react";
import { snapshotBody, type SharedSnapshot } from "@/lib/shared-snapshot";
import { useAppStore } from "@/stores/useAppStore";

function payloadOf(state: {
  staff: SharedSnapshot["staff"];
  settings: SharedSnapshot["settings"];
  requests: SharedSnapshot["requests"];
  assignments: SharedSnapshot["assignments"];
}) {
  return JSON.stringify(snapshotBody(state));
}

/**
 * ログイン中の保存データは1つだけ。
 * ブラウザごとのローカル保存は、共通データがまだ無いときの初期値にだけ使う。
 */
export default function SharedStateSync() {
  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let lastSent = "";
    let timer = 0;

    const push = () => {
      const body = payloadOf(useAppStore.getState());
      if (body === lastSent) return;
      lastSent = body;
      void fetch("/api/shared", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }).then((res) => {
        if (!res.ok) lastSent = "";
      });
    };

    const schedule = () => {
      if (!ready || cancelled) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(push, 400);
    };

    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (
        state.staff === prev.staff &&
        state.settings === prev.settings &&
        state.requests === prev.requests &&
        state.assignments === prev.assignments
      ) {
        return;
      }
      schedule();
    });

    const start = async () => {
      const me = await fetch("/api/auth/me");
      if (!me.ok || cancelled) return;
      const res = await fetch("/api/shared");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as SharedSnapshot | { empty?: boolean };
      if ("updatedAt" in data && typeof data.updatedAt === "string") {
        lastSent = payloadOf(data);
        useAppStore.getState().applyShared(data);
      } else {
        push();
      }
      ready = true;
    };

    if (useAppStore.persist.hasHydrated()) {
      void start();
    } else {
      const stop = useAppStore.persist.onFinishHydration(() => {
        void start();
      });
      return () => {
        cancelled = true;
        ready = false;
        window.clearTimeout(timer);
        unsubscribe();
        stop();
      };
    }

    return () => {
      cancelled = true;
      ready = false;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  return null;
}
