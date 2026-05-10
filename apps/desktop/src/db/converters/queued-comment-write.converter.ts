import type {
  InsertCommentInput,
  QueuedCommentWrite,
  UpsertLiveSessionUserInput,
  UpsertUserInput,
} from "../types";

export function toUpsertUserInput(item: QueuedCommentWrite): UpsertUserInput {
  return {
    platform: item.platform,
    platformUserId: item.platformUserId,
    displayName: item.displayName,
    seenAt: item.commentedAt,
  };
}

export function toInsertCommentInput(
  item: QueuedCommentWrite,
  userId: number,
): InsertCommentInput {
  return {
    liveSessionId: item.liveSessionId,
    userId,
    platform: item.platform,
    platformCommentId: item.platformCommentId,
    commentText: item.commentText,
    commentType: item.commentType,
    isLowSignal: item.isLowSignal,
    commentedAt: item.commentedAt,
  };
}

export function toUpsertLiveSessionUserInput(
  item: QueuedCommentWrite,
  userId: number,
): UpsertLiveSessionUserInput {
  return {
    liveSessionId: item.liveSessionId,
    userId,
    commentAt: item.commentedAt,
  };
}
