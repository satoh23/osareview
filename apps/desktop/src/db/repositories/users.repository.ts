import { getDatabase } from "../connection";
import type { UpsertUserInput } from "../types";

/**
 * Insert or update by `(platform, platform_user_id)`.
 * On conflict: refreshes display name and last_seen only.
 * `visit_count` is incremented once per live session when `live_session_users` is first inserted (see migration trigger).
 */
export async function upsertUser(input: UpsertUserInput): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO users (
      platform, platform_user_id, display_name, first_seen_at, last_seen_at
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(platform, platform_user_id) DO UPDATE SET
      display_name = excluded.display_name,
      last_seen_at = excluded.last_seen_at
    RETURNING id
    `,
    [
      input.platform,
      input.platformUserId,
      input.displayName,
      input.seenAt,
      input.seenAt,
    ],
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row === undefined || typeof row.id !== "number") {
    throw new Error("upsertUser: expected RETURNING id row");
  }
  return row.id;
}
