import { firstRow, getDatabase } from "../../../shared/api/sqlite";
import type { InsertCommentInput } from "../model/types";

export type CommentHistoryRow = {
  id: number;
  liveSessionId: number;
  platform: string;
  platformCommentId: string | null;
  commentText: string;
  commentType: string;
  isLowSignal: boolean;
  commentedAt: string;
  liveSessionTitle: string | null;
  liveSessionPlatformLiveId: string | null;
  liveSessionStartedAt: string | null;
};

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

  let rows: { id: number } | { id: number }[];
  try {
    rows = await db.select<{ id: number }>(
      `
      INSERT INTO comments (
        live_session_id, user_id, platform, platform_comment_id,
        comment_text, comment_type, is_low_signal, commented_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
  } catch (error) {
    if (
      platformCommentId &&
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed") &&
      error.message.includes("comments") &&
      error.message.includes("platform_comment_id")
    ) {
      return { inserted: false, reason: "duplicate_platform_comment" };
    }
    throw error;
  }

  const row = firstRow(rows);
  if (row !== undefined && typeof row.id === "number") {
    return { inserted: true, id: row.id };
  }

  throw new Error("コメントを保存できませんでした。保存結果を確認できません。");
}

/**
 * 指定ユーザーのコメント履歴を `live_sessions` と JOIN して取得する。
 * `commented_at` 降順で最大 `limit` 件を返す。
 */
export async function listCommentsByUserId({
  userId,
  limit,
}: {
  userId: number;
  limit: number;
}): Promise<CommentHistoryRow[]> {
  const db = await getDatabase();
  const rawRows = await db.select<{
    id: number;
    live_session_id: number;
    platform: string;
    platform_comment_id: string | null;
    comment_text: string;
    comment_type: string;
    is_low_signal: number;
    commented_at: string;
    live_session_title: string | null;
    live_session_platform_live_id: string | null;
    live_session_started_at: string | null;
  }>(
    `
    SELECT
      c.id,
      c.live_session_id,
      c.platform,
      c.platform_comment_id,
      c.comment_text,
      c.comment_type,
      c.is_low_signal,
      c.commented_at,
      ls.title AS live_session_title,
      ls.platform_live_id AS live_session_platform_live_id,
      ls.started_at AS live_session_started_at
    FROM comments c
    INNER JOIN live_sessions ls ON ls.id = c.live_session_id
    WHERE c.user_id = $1
    ORDER BY c.commented_at DESC
    LIMIT $2
    `,
    [userId, limit],
  );
  const rows = Array.isArray(rawRows) ? rawRows : [rawRows];
  return rows.map((row) => ({
    id: row.id,
    liveSessionId: row.live_session_id,
    platform: row.platform,
    platformCommentId: row.platform_comment_id,
    commentText: row.comment_text,
    commentType: row.comment_type,
    isLowSignal: row.is_low_signal === 1,
    commentedAt: row.commented_at,
    liveSessionTitle: row.live_session_title,
    liveSessionPlatformLiveId: row.live_session_platform_live_id,
    liveSessionStartedAt: row.live_session_started_at,
  }));
}
