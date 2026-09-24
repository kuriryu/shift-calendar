import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function GET() {
  const jar = await cookies();
  const session = await parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email: session.email });
}
