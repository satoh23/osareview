import { firstRow, getDatabase } from "../../shared/api/sqlite";
import type { UpsertLiveSessionUserInput } from "../types";

/**
 * `(live_session_id, user_id)` で INSERT または UPDATE。
 * 競合時: `last_comment_at` を進め、`comment_count` を増やす。
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
  const row = firstRow(rows);
  if (row === undefined || typeof row.id !== "number") {
    throw new Error("upsertLiveSessionUser: expected RETURNING id row");
  }
  return row.id;
}
