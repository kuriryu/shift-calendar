import type { Role } from "@/types";
import { ROLE_LABELS } from "@/types";

export const ROLE_ORDER: Role[] = ["employee", "part_time", "student"];

/** 属性ごとのアイコン・色（一覧・カード・絞り込みで共通） */
export const ROLE_META: Record<
  Role,
  { icon: string; label: string; chip: string; soft: string }
> = {
  employee: {
    icon: "badge",
    label: ROLE_LABELS.employee,
    chip: "bg-blue-100 text-blue-700",
    soft: "bg-blue-50 text-blue-600",
  },
  part_time: {
    icon: "schedule",
    label: ROLE_LABELS.part_time,
    chip: "bg-emerald-100 text-emerald-700",
    soft: "bg-emerald-50 text-emerald-600",
  },
  student: {
    icon: "school",
    label: ROLE_LABELS.student,
    chip: "bg-amber-100 text-amber-700",
    soft: "bg-amber-50 text-amber-600",
  },
};
