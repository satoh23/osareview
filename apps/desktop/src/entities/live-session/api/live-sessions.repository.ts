import { firstRow, getDatabase } from "../../../shared/api/sqlite";
import type { UpsertLiveSessionInput } from "../model/types";

/**
 * `(platform, platform_live_id)` で INSERT または UPDATE。
 * 競合時: 呼び出し元が非 null を渡した nullable 列だけ COALESCE で埋める。
 */
export async function upsertLiveSession(
  input: UpsertLiveSessionInput,
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO live_sessions (
      platform, platform_live_id, title, started_at, ended_at
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(platform, platform_live_id) DO UPDATE SET
      title = COALESCE(excluded.title, live_sessions.title),
      started_at = COALESCE(excluded.started_at, live_sessions.started_at),
      ended_at = COALESCE(excluded.ended_at, live_sessions.ended_at)
    RETURNING id
    `,
    [
      input.platform,
      input.platformLiveId,
      input.title ?? null,
      input.startedAt ?? null,
      input.endedAt ?? null,
    ],
  );
  const row = firstRow(rows);
  if (row === undefined || typeof row.id !== "number") {
    throw new Error(
      "配信セッションを保存できませんでした。保存結果を確認できません。",
    );
  }
  return row.id;
}
