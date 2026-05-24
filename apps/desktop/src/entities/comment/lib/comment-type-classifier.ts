import type { CommentType } from "../model/types";
import { isLowSignalText } from "./low-signal";

const FIRST_TIME_PATTERNS = [/初見/, /はじめまして/, /初めて/];
const LONG_TIME_NO_SEE_PATTERNS = [
  /久しぶり/,
  /ひさしぶり/,
  /[0-9０-９]+(?:か月|ヶ月|週間|日)ぶり/,
];
const THANKS_PATTERNS = [/ありがとう/, /感謝/, /助かる/, /助かりました/];
const PRAISE_PATTERNS = [
  /かわいい/,
  /可愛い/,
  /すごい/,
  /最高/,
  /うまい/,
  /上手/,
];
const SELF_DISCLOSURE_PATTERNS = [
  /仕事/,
  /学校/,
  /試験/,
  /買った/,
  /来れた/,
  /見てる/,
];
const CAUTION_PATTERNS = [/荒らし/, /ネタバレ/, /spam/i, /スパム/];

const matchesAny = (text: string, patterns: readonly RegExp[]): boolean =>
  patterns.some((p) => p.test(text));

/**
 * コメントテキストから CommentType を判定する。
 * イベント種別（support など）は含まない。
 * 何も該当しない場合は空配列を返す（呼び出し元で "normal" を付与すること）。
 */
export function classifyCommentTextTypes(text: string): CommentType[] {
  const t = text.trim();
  const types: CommentType[] = [];

  if (isLowSignalText(t)) types.push("low_signal");
  if (t.includes("?") || t.includes("？")) types.push("question");
  if (matchesAny(t, FIRST_TIME_PATTERNS)) types.push("first_time");
  if (matchesAny(t, LONG_TIME_NO_SEE_PATTERNS)) types.push("long_time_no_see");
  if (matchesAny(t, THANKS_PATTERNS)) types.push("thanks");
  if (matchesAny(t, PRAISE_PATTERNS)) types.push("praise");
  if (matchesAny(t, SELF_DISCLOSURE_PATTERNS)) types.push("self_disclosure");
  if (matchesAny(t, CAUTION_PATTERNS)) types.push("caution");

  return types;
}
