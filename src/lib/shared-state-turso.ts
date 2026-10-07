import { createClient } from "@libsql/client";
import { isSnapshotBody, type SharedSnapshot } from "@/lib/shared-snapshot";

const TABLE_SQL = `CREATE TABLE IF NOT EXISTS shared_snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  updated_at TEXT NOT NULL,
  body TEXT NOT NULL
)`;

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Turso is not configured");
  }
  return createClient({ url, authToken });
}

async function withReadyClient<T>(
  fn: (client: ReturnType<typeof createClient>) => Promise<T>,
): Promise<T> {
  const client = getClient();
  await client.execute(TABLE_SQL);
  return fn(client);
}

export async function readSharedSnapshotFromTurso(): Promise<SharedSnapshot | null> {
  return withReadyClient(async (client) => {
    const result = await client.execute(
      "SELECT updated_at, body FROM shared_snapshot WHERE id = 1",
    );
    if (result.rows.length === 0) return null;

    const updatedAt = result.rows[0].updated_at;
    const bodyText = result.rows[0].body;
    if (typeof updatedAt !== "string" || typeof bodyText !== "string") return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return null;
    }
    if (!isSnapshotBody(parsed)) return null;
    return { ...parsed, updatedAt };
  });
}

export async function writeSharedSnapshotFromTurso(
  body: Omit<SharedSnapshot, "updatedAt">,
): Promise<SharedSnapshot> {
  const updatedAt = new Date().toISOString();
  await withReadyClient((client) =>
    client.execute({
      sql: `INSERT INTO shared_snapshot (id, updated_at, body) VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, body = excluded.body`,
      args: [updatedAt, JSON.stringify(body)],
    }),
  );
  return { ...body, updatedAt };
}
