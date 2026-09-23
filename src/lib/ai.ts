import type { Staff } from "@/types";
import { daysOfMonth } from "./dates";

// モック AI アシスタント: パターンマッチでシフト操作コマンドに変換する
// 対応: 交代 / 時間変更 / 休み変更 / ラストを社員に

export type AiCommand =
  | { kind: "swap"; date: string; staffAId: string; staffBId: string }
  | { kind: "set_time"; date: string; staffId: string; start: string; end: string }
  | { kind: "set_off"; date: string; staffId: string }
  | { kind: "close_to_employee"; date: string };

export type ParseResult =
  | { ok: true; command: AiCommand; summary: string }
  | { ok: false; reply: string };

const FAILURE_REPLY = `その指示は理解できませんでした。例:
・「10日のAさんとBさんを交代して」
・「15日のAさんを9:00-13:00に変更して」
・「15日のAさんを休みにして」
・「15日のラストを社員に変更して」`;

function normalize(text: string): string {
  return text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[〜～–—]/g, "-")
    .replace(/：/g, ":")
    .replace(/\s+/g, "");
}

/** テキスト中の日付を抽出。月省略時は選択中の月を使う */
function extractDate(text: string, month: string): string | null {
  const full = text.match(/(\d{1,2})月(\d{1,2})日/);
  const slash = text.match(/(\d{1,2})\/(\d{1,2})/);
  const dayOnly = text.match(/(\d{1,2})日/);

  const [year, selMonth] = month.split("-").map(Number);
  let m: number;
  let d: number;
  if (full) {
    m = Number(full[1]);
    d = Number(full[2]);
  } else if (slash) {
    m = Number(slash[1]);
    d = Number(slash[2]);
  } else if (dayOnly) {
    m = selMonth;
    d = Number(dayOnly[1]);
  } else {
    return null;
  }

  const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return daysOfMonth(month).includes(dateStr) ? dateStr : null;
}

/** テキストに含まれるスタッフを名前の長い順に抽出 */
function extractStaff(text: string, staffList: Staff[]): Staff[] {
  const found: Array<{ staff: Staff; index: number }> = [];
  for (const s of staffList) {
    const short = s.name.split(" ")[0]; // 「田中 店長」→「田中」
    const candidates = [s.name, short, short + "さん"];
    for (const c of candidates) {
      const idx = text.indexOf(c);
      if (idx >= 0) {
        found.push({ staff: s, index: idx });
        break;
      }
    }
  }
  // 文中の出現順に並べる（「AさんとBさん」→ [A, B]）
  return found
    .sort((a, b) => a.index - b.index)
    .map((f) => f.staff)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
}

/** "9:00-13:00" / "9時-13時" / "9-13" 形式の時間帯を抽出 */
function extractTimeRange(
  text: string,
): { start: string; end: string } | null {
  const m = text.match(
    /(\d{1,2})(?::(\d{2})|時)?-(\d{1,2})(?::(\d{2})|時)?/,
  );
  if (!m) return null;
  const sh = Number(m[1]);
  const sm = m[2] ? Number(m[2]) : 0;
  const eh = Number(m[3]);
  const em = m[4] ? Number(m[4]) : 0;
  if (sh > 24 || eh > 24 || sm >= 60 || em >= 60) return null;
  return {
    start: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
    end: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
  };
}

export function parseCommand(
  rawText: string,
  staffList: Staff[],
  month: string,
): ParseResult {
  const text = normalize(rawText);
  const date = extractDate(text, month);
  if (!date) {
    return {
      ok: false,
      reply: `日付を特定できませんでした（対象月: ${month}）。${FAILURE_REPLY}`,
    };
  }

  const mentioned = extractStaff(text, staffList);

  // 交代
  if (/交代|入れ替え|スワップ/.test(text)) {
    if (mentioned.length < 2) {
      return { ok: false, reply: `交代する2名を特定できませんでした。${FAILURE_REPLY}` };
    }
    return {
      ok: true,
      command: { kind: "swap", date, staffAId: mentioned[0].id, staffBId: mentioned[1].id },
      summary: `${mentioned[0].name} と ${mentioned[1].name} のシフトを交代`,
    };
  }

  // ラストを社員に
  if (/ラスト|閉店|締め/.test(text) && /社員/.test(text)) {
    return {
      ok: true,
      command: { kind: "close_to_employee", date },
      summary: "閉店枠を社員に変更",
    };
  }

  // 休みに
  if (/休みに|休に/.test(text)) {
    if (mentioned.length < 1) {
      return { ok: false, reply: `対象のスタッフを特定できませんでした。${FAILURE_REPLY}` };
    }
    return {
      ok: true,
      command: { kind: "set_off", date, staffId: mentioned[0].id },
      summary: `${mentioned[0].name} を休みに変更`,
    };
  }

  // 時間変更
  const range = extractTimeRange(text);
  if (range && /変更|変えて|して/.test(text)) {
    if (mentioned.length < 1) {
      return { ok: false, reply: `対象のスタッフを特定できませんでした。${FAILURE_REPLY}` };
    }
    return {
      ok: true,
      command: { kind: "set_time", date, staffId: mentioned[0].id, start: range.start, end: range.end },
      summary: `${mentioned[0].name} の勤務を ${range.start}–${range.end} に変更`,
    };
  }

  return { ok: false, reply: FAILURE_REPLY };
}
