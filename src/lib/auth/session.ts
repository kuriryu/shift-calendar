/**
 * 事前発行パスワード。
 * 本番で ACCESS_PASSWORD が未設定でも、この値でログインできる。
 */
export const ISSUED_ACCESS_PASSWORD = "20010926";

const encoder = new TextEncoder();

export const SESSION_COOKIE = "shiftkit_session";

const MAX_AGE_SEC = 60 * 60 * 24 * 14; // 14 days

function secret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.ACCESS_PASSWORD ||
    ISSUED_ACCESS_PASSWORD
  );
}

export function getAccessPassword(): string {
  const fromEnv = process.env.ACCESS_PASSWORD?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : ISSUED_ACCESS_PASSWORD;
}

/** 発行パスワードと入力値を比較 */
export function verifyAccessPassword(input: string): boolean {
  const expected = getAccessPassword();
  const actual = input.trim();
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export type SessionPayload = {
  exp: number;
};

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(sig);
}

export async function createSessionToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = toBase64Url(encoder.encode(JSON.stringify({ exp } satisfies SessionPayload)));
  const sig = await sign(body);
  return `${body}.${sig}`;
}

export async function parseSessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await sign(body);
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return null;
  try {
    const json = new TextDecoder().decode(fromBase64Url(body));
    const data = JSON.parse(json) as SessionPayload;
    if (typeof data.exp !== "number") return null;
    if (data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
