"use client";

import Icon from "@/components/Icon";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_ASSIGNMENTS, EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";
import { monthLabel } from "@/lib/dates";

export default function GenerateStep() {
  const month = useAppStore((s) => s.selectedMonth);
  const settings = useAppStore((s) => s.settings);
  const staff = useAppStore((s) => s.staff);
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const assignments = useAppStore(
    (s) => s.assignments[s.selectedMonth] ?? EMPTY_ASSIGNMENTS,
  );
  const generateDraft = useAppStore((s) => s.generateDraft);
  const setStep = useAppStore((s) => s.setStep);

  const employees = staff.filter((s) => s.role === "employee").length;
  const canGenerate = staff.length > 0;

  const run = () => {
    generateDraft();
    setStep(5);
  };

  const conditions = [
    {
      icon: "storefront",
      text: `営業時間 ${settings.openTime}〜${settings.closeTimeWeekday}（日〜木）/ 〜${settings.closeTimeWeekend}（金・土）`,
    },
    {
      icon: "groups",
      text: `開店・閉店（締め作業）時は ${settings.edgeRequired}人以上 — 下回るとエラー`,
    },
    {
      icon: "group",
      text: `原則 ${settings.normalRequired}人体制、ピーク時（${settings.peakHours
        .map((p) => `${p.start}〜${p.end}`)
        .join("・") || "なし"}）は ${settings.peakRequired}人 — 下回ると警告`,
    },
    { icon: "badge", text: "社員は毎日1人以上配置 — 不在はエラー" },
    {
      icon: "bedtime",
      text: `社員の月間休日は ${settings.employeeDaysOffTarget}日を目標 — 下回ると警告`,
    },
    { icon: "rule", text: "連勤上限・週の上限時間・希望休との矛盾もチェック" },
  ];

  return (
    <StepPanel
      step={4}
      description="登録したスタッフ情報と希望をもとに、条件に合っているか確認しながらシフト案を作成します。"
      hideNext
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 入力の状況 */}
        <section aria-labelledby="gen-inputs" className="rounded-xl bg-slate-50 p-5">
          <h4 id="gen-inputs" className="mb-3 text-sm font-semibold text-slate-700">
            {monthLabel(month)} の入力状況
          </h4>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <Icon name={staff.length > 0 ? "check_circle" : "cancel"} size={18} className={staff.length > 0 ? "text-emerald-600" : "text-red-500"} />
              スタッフ {staff.length}名（社員 {employees}名）
            </li>
            <li className="flex items-center gap-2">
              <Icon name={requests.length > 0 ? "check_circle" : "info"} size={18} className={requests.length > 0 ? "text-emerald-600" : "text-slate-400"} />
              希望入力 {requests.length}件
              {requests.length === 0 && (
                <span className="text-xs text-slate-400">（未入力＝全日出勤可能として扱います）</span>
              )}
            </li>
            {assignments.length > 0 && (
              <li className="flex items-start gap-2 text-amber-800">
                <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <span>
                  この月は既に {assignments.length}件のシフトが作成済みです。再生成しても、次のステップで「確定」するまで既存のシフトは変わりません。
                </span>
              </li>
            )}
          </ul>
        </section>

        {/* チェック条件 */}
        <section aria-labelledby="gen-conditions" className="rounded-xl border border-slate-200 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 id="gen-conditions" className="text-sm font-semibold text-slate-700">
              作成時に確認する条件
            </h4>
            <span className="text-[11px] text-slate-400">サイドバー左下の⚙で変更できます</span>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            {conditions.map((c) => (
              <li key={c.text} className="flex items-start gap-2">
                <Icon name={c.icon} size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col items-center gap-3 py-4">
        <button
          onClick={run}
          disabled={!canGenerate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Icon name="auto_awesome" size={22} />
          シフトを自動生成する
        </button>
        <p className="text-xs text-slate-400">
          生成後、確認画面で内容と懸念事項をチェックしてから確定します
        </p>
        {!canGenerate && (
          <p role="alert" className="text-sm text-red-600">
            スタッフが登録されていないため生成できません
          </p>
        )}
      </div>
    </StepPanel>
  );
}
