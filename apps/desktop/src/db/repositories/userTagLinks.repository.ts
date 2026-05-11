import { firstRow, getDatabase } from "../../shared/api/sqlite";
import type { LinkUserTagInput } from "../types";

export type LinkUserTagResult =
  | { inserted: true; id: number }
  | { inserted: false; reason: "duplicate_link" };

/**
 * `user_tag_links` に `(user_id, tag_id)` の紐付けを追加する。
 */
export async function linkUserTag(
  input: LinkUserTagInput,
): Promise<LinkUserTagResult> {
  const db = await getDatabase();
  const rows = await db.select<{ id: number }>(
    `
    INSERT INTO user_tag_links (
      user_id, tag_id
    ) VALUES ($1, $2)
    ON CONFLICT(user_id, tag_id) DO NOTHING
    RETURNING id
    `,
    [input.userId, input.tagId],
  );
  const row = firstRow(rows);
  if (row !== undefined && typeof row.id === "number") {
    return { inserted: true, id: row.id };
  }
  return { inserted: false, reason: "duplicate_link" };
}

/**
 * `user_tag_links` から `(user_id, tag_id)` の紐付けを削除する。
 * 何件消えたか（0 or 1）を返す。
 */
export async function unlinkUserTag(input: LinkUserTagInput): Promise<number> {
  const db = await getDatabase();
  await db.execute(
    `
    DELETE FROM user_tag_links
    WHERE user_id = $1 AND tag_id = $2
    `,
    [input.userId, input.tagId],
  );
  const rows = await db.select<{ count: number }>(
    `
    SELECT changes() AS count
    `,
  );
  const row = firstRow(rows);
  if (row === undefined || typeof row.count !== "number") {
    throw new Error("unlinkUserTag: expected changes() row");
  }
  return row.count;
}
