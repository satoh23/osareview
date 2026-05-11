/** `Database.select` の戻りが行オブジェクトか要素1つの配列のどちらでも扱えるよう正規化する。 */
export function firstRow<T>(rows: T | T[]): T | undefined {
  return Array.isArray(rows) ? rows[0] : rows;
}
