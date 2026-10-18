import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readBoard } from "@/lib/board-file";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { lineConfig, multicastLine, requestOrigin } from "@/lib/line";
import { recruitTargets, recruitmentText } from "@/lib/line-link";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const jar = await cookies();
  const session = await parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });

  let body: { storeId?: string; month?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (!body.storeId || !body.month || !/^\d{4}-\d{2}$/.test(body.month)) {
    return NextResponse.json({ error: "店舗と年月が必要です" }, { status: 400 });
  }

  const config = lineConfig();
  const board = await readBoard();
  const book = board.stores[body.storeId];
  if (!book) return NextResponse.json({ error: "店舗データがまだ同期されていません" }, { status: 404 });

  const text = recruitmentText(book, body.storeId, body.month, requestOrigin(request));
  const { to, unlinked } = recruitTargets(book);
  if (!config) {
    return NextResponse.json({ configured: false, sent: 0, unlinked });
  }
  if (!text) {
    return NextResponse.json({ configured: true, sent: 0, unlinked, error: "受付が開始されていません" }, { status: 409 });
  }

  const sent = await multicastLine(config.accessToken, to, text);
  if (!sent.ok) {
    return NextResponse.json(
      { configured: true, sent: 0, unlinked, error: `LINEへの送信に失敗しました（${sent.status}）` },
      { status: 502 },
    );
  }
  return NextResponse.json({ configured: true, sent: to.length, unlinked });
}
