import { NextResponse } from "next/server";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  verifyAccessPassword,
  ISSUED_ACCESS_PASSWORD,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const password = (body.password ?? "").trim();

  if (!password) {
    return NextResponse.json({ error: "パスワードを入力してください" }, { status: 400 });
  }

  // 環境変数未設定でも ISSUED_ACCESS_PASSWORD（20010926）で通す
  if (!verifyAccessPassword(password)) {
    return NextResponse.json(
      {
        error: "パスワードが違います",
        hint: `発行パスワードは ${ISSUED_ACCESS_PASSWORD} です`,
      },
      { status: 401 },
    );
  }

  try {
    const token = await createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("createSessionToken failed", err);
    return NextResponse.json(
      { error: "セッションの作成に失敗しました。しばらくして再試行してください" },
      { status: 500 },
    );
  }
}
