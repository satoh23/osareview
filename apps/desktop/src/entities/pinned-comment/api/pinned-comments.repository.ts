import { firstRow, getDatabase } from "../../../shared/api/sqlite";
import type {
  InsertPinnedCommentInput,
  PinnedCommentRow,
} from "../model/types";

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

/**
 * 指定ユーザーのピン留めコメントを、元コメント・配信セッション情報と共に取得する。
 * 元コメント（`comment_id`）がない行は元コメント関連フィールドが null になる。
 */
export async function listPinnedCommentsByUserId({
  userId,
  limit,
}: {
  userId: number;
  limit: number;
}): Promise<PinnedCommentRow[]> {
  const db = await getDatabase();
  const rawRows = await db.select<{
    id: number;
    user_id: number;
    comment_id: number | null;
    pinned_text: string;
    note: string | null;
    comment_text: string | null;
    comment_type: string | null;
    commented_at: string | null;
    comment_platform: string | null;
    live_session_id: number | null;
    live_session_title: string | null;
    live_session_platform_live_id: string | null;
    live_session_started_at: string | null;
  }>(
    `
    SELECT
      pc.id,
      pc.user_id,
      pc.comment_id,
      pc.pinned_text,
      pc.note,
      c.comment_text,
      c.comment_type,
      c.commented_at,
      c.platform AS comment_platform,
      c.live_session_id,
      ls.title AS live_session_title,
      ls.platform_live_id AS live_session_platform_live_id,
      ls.started_at AS live_session_started_at
    FROM pinned_comments pc
    LEFT JOIN comments c ON c.id = pc.comment_id
    LEFT JOIN live_sessions ls ON ls.id = c.live_session_id
    WHERE pc.user_id = $1
    ORDER BY pc.id DESC
    LIMIT $2
    `,
    [userId, limit],
  );
  const rows = Array.isArray(rawRows) ? rawRows : [rawRows];
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    commentId: row.comment_id,
    pinnedText: row.pinned_text,
    note: row.note,
    commentText: row.comment_text,
    commentType: row.comment_type,
    commentedAt: row.commented_at,
    commentPlatform: row.comment_platform,
    liveSessionId: row.live_session_id,
    liveSessionTitle: row.live_session_title,
    liveSessionPlatformLiveId: row.live_session_platform_live_id,
    liveSessionStartedAt: row.live_session_started_at,
  }));
}
