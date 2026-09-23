import type { ParsedConstraints } from "@/types";

// 特別な要望（自由テキスト）をキーワード規則で解釈するモックAIパーサ
// 解釈結果は summary として人間が確認できる形で返す

const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  月: 1,
  火: 2,
  水: 3,
  木: 4,
  金: 5,
  土: 6,
};
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function normalize(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[〜～–—]/g, "-")
    .replace(/\s+/g, "");
}

function toTime(h: number, half: boolean): string | null {
  if (h > 24) return null;
  return `${String(h).padStart(2, "0")}:${half ? "30" : "00"}`;
}

export function parseSpecialNote(raw: string): ParsedConstraints {
  const text = normalize(raw);
  const result: ParsedConstraints = {
    unavailableWeekdays: [],
    onlyWeekdays: null,
    summary: [],
  };
  if (!text) return result;

  // 「水曜は休み」「水曜日は不可」「水曜NG」
  const offRe = /([月火水木金土日])曜日?(は|の日は)?(休み|休|不可|NG|だめ|ダメ|無理)/g;
  for (const m of text.matchAll(offRe)) {
    const d = WEEKDAY_MAP[m[1]];
    if (!result.unavailableWeekdays.includes(d)) {
      result.unavailableWeekdays.push(d);
    }
  }
  if (result.unavailableWeekdays.length > 0) {
    result.summary.push(
      `${result.unavailableWeekdays.map((d) => WEEKDAY_NAMES[d]).join("・")}曜日は勤務不可`,
    );
  }

  // 「土日のみ」「土曜だけ」
  const onlyMatch = text.match(/([月火水木金土日]{1,7})(曜日?)?(のみ|だけ)/);
  if (onlyMatch) {
    const days = [...onlyMatch[1]]
      .map((c) => WEEKDAY_MAP[c])
      .filter((d) => d !== undefined);
    if (days.length > 0) {
      result.onlyWeekdays = days;
      result.summary.push(
        `${days.map((d) => WEEKDAY_NAMES[d]).join("・")}曜日のみ勤務可能`,
      );
    }
  }

  // 「17時まで」「16:30まで」「15時半まで」
  const until = text.match(/(\d{1,2})(時|:)(\d{2}|半)?まで/);
  if (until) {
    const t = toTime(
      Number(until[1]),
      until[3] === "半" || until[3] === "30",
    );
    if (t) {
      result.latestEnd = t;
      result.summary.push(`${t} まで勤務可能`);
    }
  }

  // 「10時から」「13時半から」
  const from = text.match(/(\d{1,2})(時|:)(\d{2}|半)?から/);
  if (from) {
    const t = toTime(Number(from[1]), from[3] === "半" || from[3] === "30");
    if (t) {
      result.earliestStart = t;
      result.summary.push(`${t} から勤務可能`);
    }
  }

  // 「午前は不可」「午前中はNG」
  if (/午前中?(は|が)?(不可|NG|休み|だめ|ダメ|無理)/.test(text)) {
    result.earliestStart = "12:00";
    result.summary.push("午前は勤務不可（12:00から）");
  }

  // 「週2日まで」「週3以内」
  const weekCap = text.match(/週(\d)日?(まで|以内)/);
  if (weekCap) {
    result.maxDaysPerWeek = Number(weekCap[1]);
    result.summary.push(`週${weekCap[1]}日まで`);
  }

  if (result.summary.length === 0) {
    result.summary.push("解釈できるルールが見つかりませんでした（生成には反映されません）");
  }
  return result;
}
