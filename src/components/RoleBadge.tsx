"use client";

import Icon from "@/components/Icon";
import { ROLE_META } from "@/lib/roles";
import type { Role } from "@/types";

/** 属性ラベル＋アイコン（色で区別、名前も併記して色だけに頼らない） */
export default function RoleBadge({
  role,
  size = "md",
  className = "",
}: {
  role: Role;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = ROLE_META[role];
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";
  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium ${meta.chip} ${pad} ${className}`}
    >
      <Icon name={meta.icon} size={iconSize} />
      {meta.label}
    </span>
  );
}
