import { firstRow, getDatabase } from "../../../shared/api/sqlite";
import type { UpsertUserInput, UserRow } from "../model/types";
import type { DbPlatform } from "../../live-session/model/types";

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
    throw new Error(
      "ユーザー情報を保存できませんでした。保存結果を確認できません。",
    );
  }
  return row.id;
}

/**
 * `(platform, platform_user_id)` の複合キーでユーザーを検索する。
 * 見つからない場合は `null` を返す。
 */
export async function findUserByPlatformUserId({
  platform,
  platformUserId,
}: {
  platform: DbPlatform;
  platformUserId: string;
}): Promise<UserRow | null> {
  const db = await getDatabase();
  const rows = await db.select<{
    id: number;
    platform: string;
    platform_user_id: string;
    display_name: string;
    first_seen_at: string;
    last_seen_at: string;
    visit_count: number;
    observed_comment_count: number;
    support_count: number;
    last_support_at: string | null;
  }>(
    `
    SELECT
      id,
      platform,
      platform_user_id,
      display_name,
      first_seen_at,
      last_seen_at,
      visit_count,
      observed_comment_count,
      support_count,
      last_support_at
    FROM users
    WHERE platform = $1 AND platform_user_id = $2
    LIMIT 1
    `,
    [platform, platformUserId],
  );
  const row = firstRow(rows);
  if (row === undefined) return null;
  return {
    id: row.id,
    platform: row.platform as DbPlatform,
    platformUserId: row.platform_user_id,
    displayName: row.display_name,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    visitCount: row.visit_count,
    observedCommentCount: row.observed_comment_count,
    supportCount: row.support_count,
    lastSupportAt: row.last_support_at,
  };
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
