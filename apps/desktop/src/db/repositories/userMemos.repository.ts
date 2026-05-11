import { firstRow, getDatabase } from "../../shared/api/sqlite";
import type { UpsertUserMemoInput } from "../types";

/**
 * `user_memos` を `user_id` で UPSERT。
 * 既存行がある場合は `memo` のみ更新する。
 */
export async function upsertUserMemo(
  input: UpsertUserMemoInput,
): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO user_memos (
      user_id, memo
    ) VALUES ($1, $2)
    ON CONFLICT(user_id) DO UPDATE SET
      memo = excluded.memo
    RETURNING id
    `,
    [input.userId, input.memo],
  );
  const row = firstRow(rows);
  if (row === undefined || typeof row.id !== "number") {
    throw new Error("upsertUserMemo: expected RETURNING id row");
  }
  return row.id;
}
