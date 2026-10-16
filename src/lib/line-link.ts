import { monthLabel } from "@/lib/dates";
import { recruitMessage } from "@/lib/line";
import { staffLabel, type StoreBook } from "@/lib/store-book";

export type LineStores = Record<string, StoreBook & { name: string }>;

export function parseLinkData(data: string): { storeId: string; staffId: string } | null {
  const match = /^link:([^:]+):([^:]+)$/.exec(data.trim());
  if (!match) return null;
  return { storeId: match[1], staffId: match[2] };
}

export function linkChoices(stores: LineStores): { label: string; data: string }[] {
  const choices: { label: string; data: string }[] = [];
  for (const [storeId, book] of Object.entries(stores)) {
    for (const member of book.staff) {
      if (member.lineUserId) continue;
      const name = staffLabel(member);
      const sameName = Object.values(stores).some((other) =>
        other.staff.some((item) => item.id !== member.id && !item.lineUserId && staffLabel(item) === name),
      );
      choices.push({
        label: sameName ? `${name}（${book.name}）` : name,
        data: `link:${storeId}:${member.id}`,
      });
    }
  }
  return choices;
}

export function linkLineUser(
  stores: LineStores,
  userId: string,
  target: { storeId: string; staffId: string },
  origin: string,
): { stores: LineStores; reply: string; choices: { label: string; data: string }[] } {
  const book = stores[target.storeId];
  const member = book?.staff.find((item) => item.id === target.staffId);
  if (!book || !member) {
    return {
      stores,
      reply: "そのスタッフは見つかりません。店舗画面の名前を選んでください。",
      choices: linkChoices(stores),
    };
  }

  const next: LineStores = {};
  for (const [storeId, current] of Object.entries(stores)) {
    next[storeId] = {
      ...current,
      staff: current.staff.map((item) => {
        if (item.lineUserId === userId && item.id !== member.id) {
          return { ...item, lineUserId: undefined };
        }
        if (storeId === target.storeId && item.id === member.id) {
          return { ...item, lineUserId: userId };
        }
        return item;
      }),
    };
  }

  const linked = next[target.storeId].staff.find((item) => item.id === member.id);
  const name = linked ? staffLabel(linked) : staffLabel(member);
  const openings = openRecruitmentLines(next[target.storeId], target.storeId, origin);
  const reply = openings
    ? `${book.name}の${name}として連携しました。\n${openings}`
    : `${book.name}の${name}として連携しました。募集が始まると、このトークに届きます。`;
  return { stores: next, reply, choices: [] };
}

export function matchStaffByName(
  stores: LineStores,
  text: string,
): { storeId: string; staffId: string } | "many" | null {
  const name = text.trim();
  if (!name) return null;
  const hits: { storeId: string; staffId: string }[] = [];
  for (const [storeId, book] of Object.entries(stores)) {
    for (const member of book.staff) {
      if (staffLabel(member) === name || member.name === name) hits.push({ storeId, staffId: member.id });
    }
  }
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return "many";
  return null;
}

export function recruitTargets(book: StoreBook): { to: string[]; unlinked: string[] } {
  const to: string[] = [];
  const unlinked: string[] = [];
  for (const member of book.staff) {
    if (member.lineUserId) to.push(member.lineUserId);
    else unlinked.push(staffLabel(member));
  }
  return { to, unlinked };
}

export function recruitmentText(book: StoreBook & { name: string }, storeId: string, month: string, origin: string): string | null {
  const reception = book.receptions[month];
  if (!reception?.open) return null;
  return recruitMessage({
    storeName: book.name,
    monthLabel: monthLabel(month),
    url: `${origin}/hope/${storeId}/${month}`,
    from: reception.from,
    to: reception.to,
  });
}

function openRecruitmentLines(book: StoreBook & { name: string }, storeId: string, origin: string): string {
  return Object.entries(book.receptions)
    .filter(([, reception]) => reception.open)
    .map(([month]) => recruitmentText(book, storeId, month, origin))
    .filter((line): line is string => Boolean(line))
    .join("\n\n");
}
