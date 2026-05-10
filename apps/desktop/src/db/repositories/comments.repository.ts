import { getDatabase } from "../connection";
import type { InsertCommentInput } from "../types";

export type InsertCommentResult =
  | { inserted: true; id: number }
  | { inserted: false; reason: "duplicate_platform_comment" };

/**
 * Inserts one comment row. When `platform_comment_id` is set and already exists
 * for the same platform, the insert is skipped (partial unique index).
 */
export async function insertComment(
  input: InsertCommentInput,
): Promise<InsertCommentResult> {
  const db = await getDatabase();
  const isLowSignal = input.isLowSignal ? 1 : 0;
  const commentType = input.commentType ?? "normal";
  const platformCommentId = input.platformCommentId ?? null;

  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO comments (
      live_session_id, user_id, platform, platform_comment_id,
      comment_text, comment_type, is_low_signal, commented_at, raw_payload_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT(platform, platform_comment_id) DO NOTHING
    RETURNING id
    `,
    [
      input.liveSessionId,
      input.userId,
      input.platform,
      platformCommentId,
      input.commentText,
      commentType,
      isLowSignal,
      input.commentedAt,
      input.rawPayloadJson ?? null,
    ],
  );

  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row !== undefined && typeof row.id === "number") {
    return { inserted: true, id: row.id };
  }

  if (platformCommentId) {
    return { inserted: false, reason: "duplicate_platform_comment" };
  }

  throw new Error("insertComment: expected row id but INSERT returned no row");
}
