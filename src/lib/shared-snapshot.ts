import type { ShiftAssignment, ShiftRequest, ShopSettings, Staff } from "@/types";

/** ログインした人全員で共有する、1件だけの保存データ */
export type SharedSnapshot = {
  updatedAt: string;
  staff: Staff[];
  settings: ShopSettings;
  requests: Record<string, ShiftRequest[]>;
  assignments: Record<string, ShiftAssignment[]>;
};

export function snapshotBody(input: {
  staff: Staff[];
  settings: ShopSettings;
  requests: Record<string, ShiftRequest[]>;
  assignments: Record<string, ShiftAssignment[]>;
}) {
  return {
    staff: input.staff,
    settings: input.settings,
    requests: input.requests,
    assignments: input.assignments,
  };
}

export function isSnapshotBody(body: unknown): body is Omit<SharedSnapshot, "updatedAt"> {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    Array.isArray(value.staff) &&
    !!value.settings &&
    typeof value.settings === "object" &&
    !!value.requests &&
    typeof value.requests === "object" &&
    !Array.isArray(value.requests) &&
    !!value.assignments &&
    typeof value.assignments === "object" &&
    !Array.isArray(value.assignments)
  );
}
