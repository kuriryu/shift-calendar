import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { readBoard, writeBoard, type BoardFile } from "@/lib/board-file";
import { applyHopeToBook } from "@/lib/store-book";
import type { ShiftRequest, TimeRange } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const board = await readBoard();
  return NextResponse.json(board);
}

export async function PUT(request: Request) {
  const jar = await cookies();
  const session = await parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  let body: { stores?: BoardFile["stores"] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (!body.stores || typeof body.stores !== "object") {
    return NextResponse.json({ error: "店舗データがありません" }, { status: 400 });
  }

  const current = await readBoard();
  const stores = { ...current.stores };
  for (const [id, incoming] of Object.entries(body.stores)) {
    const previous = stores[id];
    if (!previous) {
      stores[id] = incoming;
      continue;
    }
    let book = {
      ...incoming,
      hopeStamps: { ...incoming.hopeStamps },
      staff: incoming.staff.map((member) => {
        const previousMember = previous.staff.find((item) => item.id === member.id);
        if (!previousMember) return member;
        return { ...member, lineUserId: previousMember.lineUserId };
      }),
    };
    for (const [key, at] of Object.entries(previous.hopeStamps ?? {})) {
      if (at > (book.hopeStamps?.[key] ?? 0)) {
        const splitAt = key.indexOf("|");
        if (splitAt < 0) continue;
        const month = key.slice(0, splitAt);
        const staffId = key.slice(splitAt + 1);
        const kept = (book.requests[month] ?? []).filter((item) => item.staffId !== staffId);
        const remote = (previous.requests[month] ?? []).filter((item) => item.staffId === staffId);
        book = {
          ...book,
          requests: { ...book.requests, [month]: [...kept, ...remote] },
          notes: {
            ...book.notes,
            [month]: [
              ...(book.notes[month] ?? []).filter((note) => note.staffId !== staffId),
              ...(previous.notes[month] ?? []).filter((note) => note.staffId === staffId),
            ],
          },
          hopeStamps: { ...book.hopeStamps, [key]: at },
        };
      }
    }
    stores[id] = book;
  }

  const saved = await writeBoard(stores);
  return NextResponse.json(saved);
}

export async function POST(request: Request) {
  let body: {
    storeId?: string;
    staffId?: string;
    month?: string;
    requests?: ShiftRequest[];
    note?: string;
    freeTime?: TimeRange;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (!body.storeId || !body.staffId || !body.month || !Array.isArray(body.requests)) {
    return NextResponse.json({ error: "送信内容が足りません" }, { status: 400 });
  }

  const current = await readBoard();
  const store = current.stores[body.storeId];
  if (!store) {
    return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
  }
  if (!store.staff.some((member) => member.id === body.staffId)) {
    return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 });
  }

  const next = applyHopeToBook(store, {
    staffId: body.staffId,
    month: body.month,
    requests: body.requests,
    note: body.note ?? "",
    freeTime: body.freeTime,
  });
  const saved = await writeBoard({
    ...current.stores,
    [body.storeId]: { ...next, name: store.name },
  });
  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
}
