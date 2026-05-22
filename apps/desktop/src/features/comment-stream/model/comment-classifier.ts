import { COMMENT_EVENT_TYPES, type CommentViewDto } from "@comment-dock/shared";
import type {
  CommentType,
  EnrichedComment,
  ViewerStatus,
} from "../../../entities/comment";
export type {
  CommentType,
  EnrichedComment,
  SupportType,
  ViewerStatus,
} from "../../../entities/comment";

const LOW_SIGNAL_PATTERNS = [
  /^w+$/i,
  /^草+$/,
  /^[!！?？]+$/,
  /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u,
];

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

// TODO(backend): viewerStatus/commentTypes/isLowSignal/isImportant/isPinned/support/badges は将来サーバ算出 DTO に統合する。
export const enrichComment = (comment: CommentViewDto): EnrichedComment => {
  const commentTypes = classifyCommentTypes(comment);
  const support = classifySupport(comment);
  const viewerStatus = classifyViewerStatus(comment, commentTypes, support);
  const isLowSignal = commentTypes.includes("low_signal");
  const isImportant =
    !isLowSignal &&
    (Boolean(support) ||
      commentTypes.some((type) =>
        [
          "question",
          "first_time",
          "long_time_no_see",
          "support",
          "thanks",
          "praise",
          "self_disclosure",
          "caution",
        ].includes(type),
      ));

  return {
    ...comment,
    viewerStatus,
    commentTypes,
    isLowSignal,
    isImportant,
    isPinned: Boolean(support) || commentTypes.includes("caution"),
    support,
    badges: classifyBadges(comment, support),
  };
};

export const enrichComments = (
  comments: readonly CommentViewDto[],
): EnrichedComment[] => comments.map(enrichComment);

const classifyCommentTypes = (comment: CommentViewDto): CommentType[] => {
  const text = comment.text.trim();
  const types = new Set<CommentType>();

  if (comment.eventType !== COMMENT_EVENT_TYPES.NORMAL) {
    types.add("support");
  }
  if (isLowSignalText(text)) {
    types.add("low_signal");
  }
  if (text.includes("?") || text.includes("？")) {
    types.add("question");
  }
  if (matchesAny(text, FIRST_TIME_PATTERNS)) {
    types.add("first_time");
  }
  if (matchesAny(text, LONG_TIME_NO_SEE_PATTERNS)) {
    types.add("long_time_no_see");
  }
  if (matchesAny(text, THANKS_PATTERNS)) {
    types.add("thanks");
  }
  if (matchesAny(text, PRAISE_PATTERNS)) {
    types.add("praise");
  }
  if (matchesAny(text, SELF_DISCLOSURE_PATTERNS)) {
    types.add("self_disclosure");
  }
  if (matchesAny(text, CAUTION_PATTERNS)) {
    types.add("caution");
  }

  return types.size > 0 ? [...types] : ["normal"];
};

const classifyViewerStatus = (
  comment: CommentViewDto,
  commentTypes: readonly CommentType[],
  support: EnrichedComment["support"],
): ViewerStatus | undefined => {
  if (support) {
    return "supporter";
  }
  if (commentTypes.includes("first_time")) {
    return "first_time";
  }
  if (commentTypes.includes("long_time_no_see")) {
    return "long_time_no_see";
  }
  if (comment.author.name.toLowerCase().includes("sub")) {
    return "regular";
  }
  return undefined;
};

const classifySupport = (
  comment: CommentViewDto,
): EnrichedComment["support"] | undefined => {
  if (comment.eventType === COMMENT_EVENT_TYPES.SUPER_CHAT) {
    return {
      type: "super_chat",
      amountLabel: formatMonetaryAmount(comment.monetaryAmount),
      isFirstSupport: matchesAny(comment.text, [/初/, /first/i]),
    };
  }
  if (comment.eventType === COMMENT_EVENT_TYPES.SUBSCRIPTION) {
    return {
      type: comment.source === "twitch" ? "sub" : "member",
      isFirstSupport: matchesAny(comment.text, [/初/, /first/i]),
    };
  }
  return undefined;
};

const classifyBadges = (
  comment: CommentViewDto,
  support: EnrichedComment["support"],
): string[] => {
  if (support?.type === "member") {
    return ["Member"];
  }
  if (support?.type === "sub") {
    return ["Sub"];
  }
  if (comment.author.name.toLowerCase().includes("mod")) {
    return ["Mod"];
  }
  return [];
};

const isLowSignalText = (text: string): boolean =>
  text.length <= 2 || LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(text));

const matchesAny = (text: string, patterns: readonly RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(text));

const formatMonetaryAmount = (
  monetaryAmount: CommentViewDto["monetaryAmount"],
): string | undefined => {
  if (!monetaryAmount) {
    return undefined;
  }
  return `${monetaryAmount.currency} ${monetaryAmount.amount}`;
};
