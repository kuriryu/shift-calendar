import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifyAccessPassword,
  getAccessPassword,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!getAccessPassword()) {
    return NextResponse.json(
      { error: "アクセスパスワードがサーバーに設定されていません" },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください" },
      { status: 400 },
    );
  }
  if (!password) {
    return NextResponse.json(
      { error: "発行されたパスワードを入力してください" },
      { status: 400 },
    );
  }
  if (!verifyAccessPassword(password)) {
    return NextResponse.json(
      { error: "パスワードが違います。発行されたパスワードを確認してください" },
      { status: 401 },
    );
  }

  const token = await createSessionToken(email);
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
