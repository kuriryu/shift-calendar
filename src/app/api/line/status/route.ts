import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { addFriendUrl, lineConfig } from "@/lib/line";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const session = await parseSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });

  const config = lineConfig();
  if (!config) return NextResponse.json({ configured: false, addFriendUrl: null });
  return NextResponse.json({
    configured: true,
    addFriendUrl: addFriendUrl(config.basicId),
  });
}
