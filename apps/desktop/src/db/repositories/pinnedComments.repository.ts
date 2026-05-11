import { firstRow, getDatabase } from "../../shared/api/sqlite";
import type { InsertPinnedCommentInput } from "../types";

export type InsertPinnedCommentResult =
  | { inserted: true; id: number }
  | { inserted: false; reason: "duplicate_comment_pin" };

/**
 * `pinned_comments` に 1 件追加する。
 * 同一 `(user_id, comment_id)` が既にある場合は重複追加しない。
 */
export async function insertPinnedComment(
  input: InsertPinnedCommentInput,
): Promise<InsertPinnedCommentResult> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO pinned_comments (
      user_id, comment_id, pinned_text, note
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT(user_id, comment_id) DO NOTHING
    RETURNING id
    `,
    [
      input.userId,
      input.commentId ?? null,
      input.pinnedText,
      input.note ?? null,
    ],
  );
  const row = firstRow(rows);
  if (row !== undefined && typeof row.id === "number") {
    return { inserted: true, id: row.id };
  }
  return { inserted: false, reason: "duplicate_comment_pin" };
}
