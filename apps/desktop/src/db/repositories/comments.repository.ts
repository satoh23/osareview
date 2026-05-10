import { getDatabase } from "../connection";
import { firstRow } from "../select-helpers";
import type { InsertCommentInput } from "../types";

export type InsertCommentResult =
  | { inserted: true; id: number }
  | { inserted: false; reason: "duplicate_platform_comment" };

/**
 * コメントを1行 INSERT。`platform_comment_id` が同一 `platform` で既に存在する場合は
 * スキップする（部分ユニークインデックス）。
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
      comment_text, comment_type, is_low_signal, commented_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
    ],
  );

  const row = firstRow(rows);
  if (row !== undefined && typeof row.id === "number") {
    return { inserted: true, id: row.id };
  }

  if (platformCommentId) {
    return { inserted: false, reason: "duplicate_platform_comment" };
  }

  throw new Error("insertComment: expected row id but INSERT returned no row");
}
