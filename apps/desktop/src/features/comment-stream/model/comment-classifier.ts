import { COMMENT_EVENT_TYPES, type CommentViewDto } from "@comment-dock/shared";
import { classifyCommentTextTypes } from "../../../entities/comment";
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

// TODO(backend): viewerStatus/commentTypes/isLowSignal/isImportant/isPinned/support/badges は将来サーバ算出 DTO に統合する。
export const enrichComment = (comment: CommentViewDto): EnrichedComment => {
  const commentTypes = classifyCommentTypes(comment);
  const support = classifySupport(comment);
  const viewerStatus = classifyViewerStatus(comment, commentTypes, support);
  const isLowSignal = commentTypes.includes("low_signal");

  return {
    ...comment,
    viewerStatus,
    commentTypes,
    isLowSignal,
    isImportant: true,
    isPinned: true,
    support,
    badges: classifyBadges(comment, support),
  };
};

export const enrichComments = (
  comments: readonly CommentViewDto[],
): EnrichedComment[] => comments.map(enrichComment);

const classifyCommentTypes = (comment: CommentViewDto): CommentType[] => {
  const types = new Set<CommentType>(classifyCommentTextTypes(comment.text));

  if (comment.eventType !== COMMENT_EVENT_TYPES.NORMAL) {
    types.add("support");
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
      isFirstSupport: /初|first/i.test(comment.text),
    };
  }
  if (comment.eventType === COMMENT_EVENT_TYPES.SUBSCRIPTION) {
    return {
      type: comment.source === "twitch" ? "sub" : "member",
      isFirstSupport: /初|first/i.test(comment.text),
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

const formatMonetaryAmount = (
  monetaryAmount: CommentViewDto["monetaryAmount"],
): string | undefined => {
  if (!monetaryAmount) {
    return undefined;
  }
  return `${monetaryAmount.currency} ${monetaryAmount.amount}`;
};
