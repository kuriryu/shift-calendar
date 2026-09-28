import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { isSnapshotBody, type SharedSnapshot } from "@/lib/shared-snapshot";

const filePath = path.join(process.cwd(), "data", "shared-state.json");

/** パスワードで入った人全員が読む、共通の保存データ */
export async function readSharedSnapshot(): Promise<SharedSnapshot | null> {
  try {
    const text = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const updatedAt = (parsed as { updatedAt?: unknown }).updatedAt;
    if (typeof updatedAt !== "string" || !isSnapshotBody(parsed)) return null;
    return { ...(parsed as Omit<SharedSnapshot, "updatedAt">), updatedAt };
  } catch {
    return null;
  }
}

export async function writeSharedSnapshot(
  body: Omit<SharedSnapshot, "updatedAt">,
): Promise<SharedSnapshot> {
  const doc: SharedSnapshot = { ...body, updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(doc));
  await rename(tempPath, filePath);
  return doc;
}
