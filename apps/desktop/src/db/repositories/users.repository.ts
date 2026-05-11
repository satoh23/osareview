import { firstRow, getDatabase } from "../../shared/api/sqlite";
import type { UpsertUserInput } from "../types";

/**
 * `(platform, platform_user_id)` で INSERT または UPDATE。
 * 競合時は表示名と `last_seen` のみ更新。
 * `visit_count` は配信セッションごとに `live_session_users` が初回 INSERT されたときに増える（マイグレーションのトリガ参照）。
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
  const row = firstRow(rows);
  if (row === undefined || typeof row.id !== "number") {
    throw new Error("upsertUser: expected RETURNING id row");
  }
  return row.id;
}

export async function incrementObservedCommentCount(
  userId: number,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `
    UPDATE users
    SET observed_comment_count = observed_comment_count + 1
    WHERE id = $1
    `,
    [userId],
  );
}
