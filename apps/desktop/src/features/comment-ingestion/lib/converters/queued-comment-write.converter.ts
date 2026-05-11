import type { InsertCommentInput } from "../../../../entities/comment/model/types";
import type { UpsertLiveSessionUserInput } from "../../../../entities/live-session/model/types";
import type { UpsertUserInput } from "../../../../entities/user/model/types";
import type { QueuedCommentWrite } from "../../model/types";

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
