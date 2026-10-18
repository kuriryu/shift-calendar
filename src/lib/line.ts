import { createHmac, timingSafeEqual } from "crypto";
import { PUBLIC_SITE_URL } from "@/lib/public-url";

export type LineConfig = {
  channelSecret: string;
  accessToken: string;
  basicId: string;
};

export function lineConfig(): LineConfig | null {
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim() ?? "";
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() ?? "";
  const basicId = process.env.LINE_BASIC_ID?.trim() ?? "";
  if (!channelSecret || !accessToken) return null;
  return { channelSecret, accessToken, basicId };
}

export function addFriendUrl(basicId: string): string | null {
  const id = basicId.trim().replace(/^@/, "");
  if (!id) return null;
  return `https://line.me/R/ti/p/@${id}`;
}

export function verifyLineSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const digest = createHmac("sha256", secret).update(body).digest("base64");
  const actual = Buffer.from(digest);
  const expected = Buffer.from(signature);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function requestOrigin(request: Request): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) return PUBLIC_SITE_URL;
  return `${proto}://${host}`;
}

export function recruitMessage(input: {
  storeName: string;
  monthLabel: string;
  url: string;
  from: string;
  to: string;
}): string {
  return [
    `${input.storeName}の${input.monthLabel}シフト希望を募集しています。`,
    input.url,
    `期間: ${input.from} から ${input.to}`,
    "名前を選んで希望を送ってください。",
  ].join("\n");
}

type LineMessage = {
  type: "text";
  text: string;
  quickReply?: {
    items: {
      type: "action";
      action: { type: "postback"; label: string; data: string; displayText: string };
    }[];
  };
};

async function postLine(token: string, path: string, body: unknown): Promise<{ ok: true } | { ok: false; status: number }> {
  const res = await fetch(`https://api.line.me${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true };
}

export function replyMessage(text: string, choices: { label: string; data: string }[] = []): LineMessage {
  const message: LineMessage = { type: "text", text };
  const items = choices.slice(0, 13).map((choice) => ({
    type: "action" as const,
    action: {
      type: "postback" as const,
      label: choice.label.slice(0, 20),
      data: choice.data,
      displayText: choice.label.slice(0, 20),
    },
  }));
  if (items.length > 0) message.quickReply = { items };
  return message;
}

export function replyLine(token: string, replyToken: string, message: LineMessage) {
  return postLine(token, "/v2/bot/message/reply", { replyToken, messages: [message] });
}

export function multicastLine(token: string, to: string[], text: string) {
  if (to.length === 0) return Promise.resolve({ ok: true as const });
  return postLine(token, "/v2/bot/message/multicast", {
    to,
    messages: [{ type: "text", text }],
  });
}
