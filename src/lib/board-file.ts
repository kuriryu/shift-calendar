import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { StoreBook } from "@/lib/store-book";

export type BoardFile = {
  updatedAt: string;
  stores: Record<string, StoreBook & { name: string }>;
};

const filePath = path.join(process.cwd(), "data", "board.json");

function isBook(value: unknown): value is StoreBook & { name: string } {
  if (!value || typeof value !== "object") return false;
  const book = value as Record<string, unknown>;
  return typeof book.name === "string" && Array.isArray(book.staff) && !!book.settings;
}

export async function readBoard(): Promise<BoardFile> {
  try {
    const text = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return { updatedAt: "", stores: {} };
    const record = parsed as { updatedAt?: unknown; stores?: unknown };
    const stores: BoardFile["stores"] = {};
    if (record.stores && typeof record.stores === "object") {
      for (const [id, value] of Object.entries(record.stores)) {
        if (isBook(value)) stores[id] = value;
      }
    }
    return {
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
      stores,
    };
  } catch {
    return { updatedAt: "", stores: {} };
  }
}

export async function writeBoard(stores: BoardFile["stores"]): Promise<BoardFile> {
  const doc: BoardFile = { updatedAt: new Date().toISOString(), stores };
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(doc));
  await rename(tempPath, filePath);
  return doc;
}
