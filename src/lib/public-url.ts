/** 公開中の Vercel サイト。ローカルで開いていても、配るリンクはここにする。 */
export const PUBLIC_SITE_URL = "https://shift-kit.vercel.app";

export function publicOrigin(): string {
  if (typeof location === "undefined") return PUBLIC_SITE_URL;
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return PUBLIC_SITE_URL;
  return location.origin;
}

export function hopePageUrl(storeId: string, month: string): string {
  return `${publicOrigin()}/hope/${storeId}/${month}`;
}

export function sharePageUrl(storeId: string, month: string): string {
  return `${publicOrigin()}/share/${storeId}/${month}`;
}
