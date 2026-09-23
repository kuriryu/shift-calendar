import type { StepId } from "@/types";

export type StepDef = {
  id: StepId;
  label: string;
  icon: string;
  desc: string;
};

/** シフト作成の行動フロー */
export const STEPS: StepDef[] = [
  { id: 1, label: "対象月", icon: "calendar_month", desc: "何月のシフトを作るか選ぶ" },
  { id: 2, label: "スタッフ", icon: "group", desc: "属性・希望の時間帯・固定休を登録" },
  { id: 3, label: "希望入力", icon: "edit_calendar", desc: "みんなの希望を日ごとに入力" },
  { id: 4, label: "自動生成", icon: "auto_awesome", desc: "条件を確認しながら作成" },
  { id: 5, label: "確認", icon: "fact_check", desc: "提案内容と懸念事項を確認して確定" },
  { id: 6, label: "微調整", icon: "tune", desc: "ガントチャートで自由に編集" },
];

export type StepStatus = "done" | "current" | "pending";

export function clampStep(n: number): StepId {
  return Math.min(6, Math.max(1, n)) as StepId;
}
