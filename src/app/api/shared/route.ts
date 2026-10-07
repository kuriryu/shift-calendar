import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { isSnapshotBody } from "@/lib/shared-snapshot";
import { readSharedSnapshot, writeSharedSnapshot } from "@/lib/shared-state";

export const runtime = "nodejs";

async function requireSession() {
  const jar = await cookies();
  return parseSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const doc = await readSharedSnapshot();
  if (!doc) return NextResponse.json({ empty: true });
  return NextResponse.json(doc);
}

export async function PUT(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  if (!isSnapshotBody(body)) {
    return NextResponse.json({ error: "保存データの形が不正です" }, { status: 400 });
  }
  const doc = await writeSharedSnapshot(body);
  return NextResponse.json({ ok: true, updatedAt: doc.updatedAt });
}
