"use client";

import { useEffect, useState } from "react";
import HeroLanding from "@/components/HeroLanding";
import StorePicker from "@/components/workspace/StorePicker";

export default function HomePage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => {
        if (!cancelled) setSignedIn(res.ok);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (signedIn === null) {
    return <div className="min-h-dvh bg-[var(--ds-canvas)]" />;
  }
  if (!signedIn) return <HeroLanding />;
  return <StorePicker />;
}
