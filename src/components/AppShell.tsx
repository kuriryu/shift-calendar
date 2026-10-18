"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import WorkspaceFrame from "@/components/workspace/WorkspaceFrame";
import { LOGIN_ENABLED } from "@/lib/auth/feature";
import { useAppStore } from "@/stores/useAppStore";
import { useMounted } from "@/hooks/useMounted";

function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

export default function AppShell({ children }: { email: string | null; children: React.ReactNode }) {
  const mounted = useMounted();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const router = useRouter();
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const recordLogin = useAppStore((s) => s.recordLogin);
  const [authenticated, setAuthenticated] = useState(false);
  const [storeReady, setStoreReady] = useState(false);

  useEffect(() => {
    if (!LOGIN_ENABLED) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => {
        if (!cancelled) setAuthenticated(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAuthenticated(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (sessionStorage.getItem("login-recorded")) return;
    sessionStorage.setItem("login-recorded", "1");
    recordLogin("ログイン");
  }, [authenticated, recordLogin]);

  useEffect(() => {
    if (!hydrated) return;
    useAppStore.getState().ensureDefaultStore();
    setStoreReady(true);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || activeStoreId || pathname === "/") return;
    router.replace("/");
  }, [activeStoreId, hydrated, pathname, router]);

  if (!mounted || !hydrated || !storeReady) {
    return <div className="min-h-dvh bg-slate-50" />;
  }

  if (!activeStoreId || pathname === "/") {
    return <div className="min-h-dvh bg-slate-50">{children}</div>;
  }

  return <WorkspaceFrame>{children}</WorkspaceFrame>;
}
