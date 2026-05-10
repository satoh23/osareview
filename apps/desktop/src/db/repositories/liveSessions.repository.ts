import { getDatabase } from "../connection";
import type { UpsertLiveSessionInput } from "../types";

/**
 * Insert or update by `(platform, platform_live_id)`.
 * On conflict: fills in nullable fields when the caller passes non-null excluded values.
 */
export async function upsertLiveSession(
  input: UpsertLiveSessionInput,
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO live_sessions (
      platform, platform_live_id, title, started_at, ended_at
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(platform, platform_live_id) DO UPDATE SET
      title = COALESCE(excluded.title, live_sessions.title),
      started_at = COALESCE(excluded.started_at, live_sessions.started_at),
      ended_at = COALESCE(excluded.ended_at, live_sessions.ended_at)
    RETURNING id
    `,
    [
      input.platform,
      input.platformLiveId,
      input.title ?? null,
      input.startedAt ?? null,
      input.endedAt ?? null,
    ],
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row === undefined || typeof row.id !== "number") {
    throw new Error("upsertLiveSession: expected RETURNING id row");
  }
  return row.id;
}
