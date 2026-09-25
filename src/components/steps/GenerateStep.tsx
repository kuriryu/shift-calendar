"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import StepPanel from "@/components/steps/StepPanel";
import GenerateConfirmDialog from "@/components/GenerateConfirmDialog";
import SettingsModal from "@/components/SettingsModal";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const employees = staff.filter((s) => s.role === "employee").length;
  const canGenerate = staff.length > 0;

  const run = () => {
    generateDraft();
    setStep(5);
  };

  const conditions: {
    icon: string;
    text: string;
    severity: "error" | "warning" | "check";
  }[] = [
    {
      icon: "storefront",
      text: `営業時間 ${settings.openTime}〜${settings.closeTimeWeekday}（日〜木）/ 〜${settings.closeTimeWeekend}（金・土）`,
      severity: "check",
    },
    {
      icon: "groups",
      text: `開店・閉店（締め作業）時は ${settings.edgeRequired}人以上`,
      severity: "error",
    },
    {
      icon: "group",
      text: `原則 ${settings.normalRequired}人体制、ピーク時（${settings.peakHours
        .map((p) => `${p.start}〜${p.end}`)
        .join("・") || "なし"}）は ${settings.peakRequired}人`,
      severity: "warning",
    },
    {
      icon: "badge",
      text: "社員は毎日1人以上配置",
      severity: "error",
    },
    {
      icon: "bedtime",
      text: `社員の月間休日は ${settings.employeeDaysOffTarget}日を目標`,
      severity: "warning",
    },
    {
      icon: "rule",
      text: "連勤上限・週の上限時間・希望休との矛盾もチェック",
      severity: "check",
    },
  ];

  const severityChip = {
    error: { label: "エラー", className: "bg-red-50 text-red-700 ring-red-100" },
    warning: { label: "警告", className: "bg-amber-50 text-amber-800 ring-amber-100" },
    check: { label: "確認", className: "bg-slate-100 text-slate-600 ring-slate-200/80" },
  } as const;

  return (
    <StepPanel
      step={4}
      nextLabel="生成"
      onNext={() => setConfirmOpen(true)}
      nextDisabled={!canGenerate}
    >
      <div className="grid w-full gap-6 lg:grid-cols-2">
        <section aria-labelledby="gen-inputs" className="rounded-xl border border-slate-200 bg-white p-5">
          <h4 id="gen-inputs" className="mb-4 text-sm font-semibold text-slate-700">
            {monthLabel(month)} の入力状況
          </h4>
          <ul className="space-y-3">
            <li
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${
                staff.length > 0 ? "bg-emerald-50" : "bg-red-50"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ${
                  staff.length > 0 ? "text-emerald-600" : "text-red-500"
                }`}
                aria-hidden
              >
                <Icon name={staff.length > 0 ? "check_circle" : "cancel"} size={20} />
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    staff.length > 0 ? "text-emerald-800" : "text-red-800"
                  }`}
                >
                  スタッフ {staff.length}名
                </p>
                <p className="text-xs text-slate-500">社員 {employees}名を含む</p>
              </div>
            </li>
            <li
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${
                requests.length > 0 ? "bg-emerald-50" : "bg-slate-100"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ${
                  requests.length > 0 ? "text-emerald-600" : "text-slate-400"
                }`}
                aria-hidden
              >
                <Icon
                  name={requests.length > 0 ? "check_circle" : "info"}
                  size={20}
                />
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    requests.length > 0 ? "text-emerald-800" : "text-slate-700"
                  }`}
                >
                  希望入力 {requests.length}件
                </p>
                {requests.length === 0 && (
                  <p className="text-xs text-slate-400">
                    未入力＝全日出勤可能として扱います
                  </p>
                )}
              </div>
            </li>
            {assignments.length > 0 && (
              <li className="flex items-start gap-3 rounded-xl bg-amber-50 px-3.5 py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-600"
                  aria-hidden
                >
                  <Icon name="warning" size={20} />
                </span>
                <div className="min-w-0 text-sm text-amber-900">
                  <p className="font-semibold">既存シフト {assignments.length}件</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80">
                    再生成しても、次のステップで「確定」するまで既存のシフトは変わりません。
                  </p>
                </div>
              </li>
            )}
          </ul>
        </section>

        <section aria-labelledby="gen-conditions" className="rounded-xl border border-slate-200 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h4 id="gen-conditions" className="text-sm font-semibold text-slate-700">
              作成時に確認する条件
            </h4>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <Icon name="edit" size={14} />
              編集
            </button>
          </div>
          <ul className="space-y-2">
            {conditions.map((c) => {
              const chip = severityChip[c.severity];
              return (
                <li
                  key={c.text}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-3 rounded-lg px-1 py-1.5 text-sm text-slate-700"
                >
                  <span className="justify-self-start pt-0.5">
                    <span
                      className={`inline-flex min-w-[2.75rem] justify-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${chip.className}`}
                    >
                      {chip.label}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-start gap-2.5">
                    <Icon
                      name={c.icon}
                      size={18}
                      className="mt-0.5 shrink-0 text-blue-500"
                    />
                    <span className="leading-snug">{c.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="flex flex-col items-center gap-2 py-4">
        <p className="px-0.5 py-1.5 text-center text-xs leading-relaxed text-slate-400">
          生成後、確認画面で内容と懸念事項をチェックしてから確定します
        </p>
        {!canGenerate && (
          <p role="alert" className="text-sm text-red-600">
            スタッフが登録されていないため生成できません
          </p>
        )}
      </div>

      <GenerateConfirmDialog
        isOpen={confirmOpen}
        hasExisting={assignments.length > 0}
        onConfirm={run}
        onClose={() => setConfirmOpen(false)}
      />
      {settingsOpen && (
        <SettingsModal isOpen onClose={() => setSettingsOpen(false)} />
      )}
    </StepPanel>
  );
}
