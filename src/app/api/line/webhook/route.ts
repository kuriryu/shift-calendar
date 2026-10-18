import { NextResponse } from "next/server";
import { readBoard, writeBoard } from "@/lib/board-file";
import { lineConfig, replyLine, replyMessage, requestOrigin, verifyLineSignature } from "@/lib/line";
import { linkChoices, linkLineUser, matchStaffByName, parseLinkData } from "@/lib/line-link";

export const runtime = "nodejs";

type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
  postback?: { data?: string };
};

export async function POST(request: Request) {
  const config = lineConfig();
  if (!config) {
    return NextResponse.json({ error: "LINE公式アカウントが未接続です" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-line-signature");
  if (!verifyLineSignature(body, signature, config.channelSecret)) {
    return NextResponse.json({ error: "署名が一致しません" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    const parsed = JSON.parse(body) as { events?: LineEvent[] };
    events = Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const origin = requestOrigin(request);
  for (const event of events) {
    const userId = event.source?.userId;
    const replyToken = event.replyToken;
    if (!userId || !replyToken) continue;
    if (event.type !== "follow" && event.type !== "message" && event.type !== "postback") continue;

    const board = await readBoard();
    const outcome = outcomeFor(event, board.stores, userId, origin);
    if (outcome.stores !== board.stores) await writeBoard(outcome.stores);
    await replyLine(config.accessToken, replyToken, replyMessage(outcome.reply, outcome.choices));
  }

  return NextResponse.json({ ok: true });
}

function outcomeFor(
  event: LineEvent,
  stores: Awaited<ReturnType<typeof readBoard>>["stores"],
  userId: string,
  origin: string,
): { stores: Awaited<ReturnType<typeof readBoard>>["stores"]; reply: string; choices: { label: string; data: string }[] } {
  const data = event.type === "postback" ? event.postback?.data : undefined;
  const linked = data ? parseLinkData(data) : null;
  if (linked) return linkLineUser(stores, userId, linked, origin);

  if (event.type === "message" && event.message?.type === "text") {
    const text = event.message.text ?? "";
    const command = parseLinkData(text);
    if (command) return linkLineUser(stores, userId, command, origin);
    const match = matchStaffByName(stores, text);
    if (match && match !== "many") return linkLineUser(stores, userId, match, origin);
    if (match === "many") {
      return {
        stores,
        reply: "同じ名前が複数あります。ボタンから店舗ごとの名前を選んでください。",
        choices: linkChoices(stores).filter((choice) => choice.label.startsWith(text.trim())),
      };
    }
  }

  const choices = linkChoices(stores);
  return {
    stores,
    reply: choices.length
      ? "シフト希望を受け取る名前を選んでください。"
      : "連携できるスタッフがいません。店舗画面で先に登録してください。",
    choices,
  };
}
