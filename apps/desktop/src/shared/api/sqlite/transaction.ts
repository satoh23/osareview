import { getDatabase } from "./connection";

/**
 * 共有 SQLite 接続で `BEGIN IMMEDIATE` トランザクションを実行する。
 * 正常時は COMMIT、失敗時は ROLLBACK して例外を再送出する。
 */
export async function withImmediateTransaction<T>(
  work: () => Promise<T>,
): Promise<T> {
  const db = await getDatabase();
  await db.execute("BEGIN IMMEDIATE");
  try {
    const result = await work();
    await db.execute("COMMIT");
    return result;
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}
