import type { StepId } from "@/types";

export type StepDef = {
  id: StepId;
  label: string;
  icon: string;
  desc: string;
};

/** シフト作成の行動フロー */
export const STEPS: StepDef[] = [
  {
    id: 1,
    label: "条件設定",
    icon: "rule",
    desc: "営業時間や必要人数など、シフトを作る条件を決めてください。",
  },
  {
    id: 2,
    label: "対象月",
    icon: "calendar_month",
    desc: "作成するシフトの対象月を選んでください。",
  },
  {
    id: 3,
    label: "スタッフ",
    icon: "group",
    desc: "シフトに入れるスタッフを登録してください。名前と属性は必須です。",
  },
  {
    id: 4,
    label: "希望入力",
    icon: "edit_calendar",
    desc: "一人ずつ、月のカレンダーで希望を入力してください。最初はすべての日が休みです。",
  },
  {
    id: 5,
    label: "自動生成",
    icon: "auto_awesome",
    desc: "シフトを自動生成してください。",
  },
  {
    id: 6,
    label: "調整",
    icon: "tune",
    desc: "シフトを日・週・月で見て、必要なら調整してください。",
  },
];

export type StepStatus = "done" | "current" | "pending";

export function clampStep(n: number): StepId {
  return Math.min(6, Math.max(1, n)) as StepId;
}
