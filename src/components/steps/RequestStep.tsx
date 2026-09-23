"use client";

import Icon from "@/components/Icon";
import RequestMatrix from "@/components/RequestMatrix";
import StepPanel from "@/components/steps/StepPanel";
import { EMPTY_REQUESTS, useAppStore } from "@/stores/useAppStore";

export default function RequestStep() {
  const requests = useAppStore((s) => s.requests[s.selectedMonth] ?? EMPTY_REQUESTS);
  const staff = useAppStore((s) => s.staff);

  const offCount = requests.filter((r) => r.type === "off").length;
  const limitedCount = requests.filter((r) => r.type === "time_limited").length;
  const availableCount = requests.filter((r) => r.type === "available").length;
  const inputStaff = new Set(requests.map((r) => r.staffId)).size;

  return (
    <StepPanel
      step={3}
      description="みんなの希望（出勤可能・休み・時間帯）を日ごとに入力します。未入力の日は「出勤可能」として扱われます。"
    >
      <dl className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-1.5">
          <dt className="text-slate-500">入力済みスタッフ</dt>
          <dd className="font-bold text-slate-800">
            {inputStaff} / {staff.length}名
          </dd>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-1.5">
          <dt className="text-slate-500">休み</dt>
          <dd className="font-bold text-slate-800">{offCount}件</dd>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-1.5">
          <dt className="text-slate-500">時間帯指定</dt>
          <dd className="font-bold text-slate-800">{limitedCount}件</dd>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-50 px-4 py-1.5">
          <dt className="text-slate-500">出勤可能</dt>
          <dd className="font-bold text-slate-800">{availableCount}件</dd>
        </div>
      </dl>

      {requests.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Icon name="lightbulb" size={18} />
          まだ希望が入力されていません。候補（薄いグレー）をタップするか、「全員の候補を採用」で一括入力できます。
        </p>
      )}

      <RequestMatrix />
    </StepPanel>
  );
}
