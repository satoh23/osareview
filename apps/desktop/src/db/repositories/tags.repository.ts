import { firstRow, getDatabase } from "../../shared/api/sqlite";
import type { CreateTagInput, DeleteTagInput } from "../types";

export type CreateTagResult =
  | { inserted: true; id: number }
  | { inserted: false; id: number; reason: "duplicate_name" };

/**
 * タグマスタ（`tags`）にタグを作成する。
 * 同名タグが既にある場合は既存IDを返す。
 */
export async function createTag(
  input: CreateTagInput,
): Promise<CreateTagResult> {
  const db = await getDatabase();
  const insertRows = await db.select<{ id: number }>(
    `
    INSERT INTO tags (
      name
    ) VALUES ($1)
    ON CONFLICT(name) DO NOTHING
    RETURNING id
    `,
    [input.name],
  );
  const inserted = firstRow(insertRows);
  if (inserted !== undefined && typeof inserted.id === "number") {
    return { inserted: true, id: inserted.id };
  }

  const existingRows = await db.select<{ id: number }>(
    `
    SELECT id
    FROM tags
    WHERE name = $1
    LIMIT 1
    `,
    [input.name],
  );
  const existing = firstRow(existingRows);
  if (existing === undefined || typeof existing.id !== "number") {
    throw new Error("createTag: expected existing tag id row");
  }
  return { inserted: false, id: existing.id, reason: "duplicate_name" };
}

/**
 * タグマスタ（`tags`）からタグを削除する。
 * 削除時は FK の ON DELETE CASCADE で `user_tag_links` も自動削除される。
 */
export async function deleteTag(input: DeleteTagInput): Promise<number> {
  const db = await getDatabase();
  await db.execute(
    `
    DELETE FROM tags
    WHERE id = $1
    `,
    [input.tagId],
  );
  const rows = await db.select<{ count: number }>(
    `
    SELECT changes() AS count
    `,
  );
  const row = firstRow(rows);
  if (row === undefined || typeof row.count !== "number") {
    throw new Error("deleteTag: expected changes() row");
  }
  return row.count;
}
