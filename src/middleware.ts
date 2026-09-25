import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_ENABLED } from "@/lib/auth/feature";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  if (!LOGIN_ENABLED) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:png|ico|svg|jpg|jpeg|webp|txt|xml)$/i.test(pathname);

  if (isPublic) {
    return NextResponse.next();
  }

  const session = await parseSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
