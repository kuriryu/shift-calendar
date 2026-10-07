import {
  readSharedSnapshot as readSharedSnapshotFromFile,
  writeSharedSnapshot as writeSharedSnapshotFromFile,
} from "@/lib/shared-state-file";
import {
  readSharedSnapshotFromTurso,
  writeSharedSnapshotFromTurso,
} from "@/lib/shared-state-turso";
import type { SharedSnapshot } from "@/lib/shared-snapshot";

function useTurso(): boolean {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

/** パスワードで入った人全員が読む、共通の保存データ */
export async function readSharedSnapshot(): Promise<SharedSnapshot | null> {
  if (useTurso()) return readSharedSnapshotFromTurso();
  return readSharedSnapshotFromFile();
}

export async function writeSharedSnapshot(
  body: Omit<SharedSnapshot, "updatedAt">,
): Promise<SharedSnapshot> {
  if (useTurso()) return writeSharedSnapshotFromTurso(body);
  return writeSharedSnapshotFromFile(body);
}
