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
    label: "対象月",
    icon: "calendar_month",
    desc: "作成するシフトの対象月を選んでください。",
  },
  {
    id: 2,
    label: "スタッフ",
    icon: "group",
    desc: "シフトに入れるスタッフを登録してください。名前と属性は必須です。",
  },
  {
    id: 3,
    label: "希望入力",
    icon: "edit_calendar",
    desc: "スタッフごとの希望（休・出勤・時間帯）を入力してください。",
  },
  {
    id: 4,
    label: "自動生成",
    icon: "auto_awesome",
    desc: "内容を確認し、シフト案を自動生成してください。",
  },
  {
    id: 5,
    label: "確認",
    icon: "fact_check",
    desc: "生成されたシフト案を確認し、問題なければ出力してください。",
  },
  {
    id: 6,
    label: "微調整",
    icon: "tune",
    desc: "確定後のシフトを日・週・月で確認し、必要なら微調整してください。",
  },
];

export type StepStatus = "done" | "current" | "pending";

export function clampStep(n: number): StepId {
  return Math.min(6, Math.max(1, n)) as StepId;
}
