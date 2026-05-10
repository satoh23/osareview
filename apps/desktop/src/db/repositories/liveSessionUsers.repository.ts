import { getDatabase } from "../connection";
import type { UpsertLiveSessionUserInput } from "../types";

/**
 * Insert or update by `(live_session_id, user_id)`.
 * On conflict: advances last_comment_at and increments comment_count.
 */
export async function upsertLiveSessionUser(
  input: UpsertLiveSessionUserInput,
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO live_session_users (
      live_session_id, user_id, first_comment_at, last_comment_at, comment_count
    ) VALUES ($1, $2, $3, $4, 1)
    ON CONFLICT(live_session_id, user_id) DO UPDATE SET
      last_comment_at = excluded.last_comment_at,
      comment_count = comment_count + 1
    RETURNING id
    `,
    [input.liveSessionId, input.userId, input.commentAt, input.commentAt],
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row === undefined || typeof row.id !== "number") {
    throw new Error("upsertLiveSessionUser: expected RETURNING id row");
  }
  return row.id;
}
