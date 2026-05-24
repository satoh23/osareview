/**
 * ISO 8601 文字列を「YYYY/MM/DD HH:mm」（ja-JP ロケール）にフォーマットする。
 * パース失敗時は元の文字列をそのまま返す。
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
