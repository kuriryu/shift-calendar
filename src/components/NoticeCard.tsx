import type { ReactNode } from "react";
import Icon from "@/components/Icon";

/** 青い角丸アイコン。案内カードの先頭に置く */
export function NoticeIcon({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
      <Icon name={name} size={16} />
    </span>
  );
}

/** 調整画面の白い案内カード */
export default function NoticeCard({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={`rounded-xl border border-slate-200 bg-white px-4 ${className}`}
    >
      {children}
    </section>
  );
}
