import type { CommentViewDto } from "@comment-dock/shared";
import type { DbPlatform, QueuedCommentWrite } from "../types";

export function toDbPlatform(value: string): DbPlatform | null {
  if (value === "youtube" || value === "twitch") {
    return value;
  }
  return null;
}

export function toQueuedCommentWrite(
  item: CommentViewDto,
  liveSessionId: number,
): QueuedCommentWrite | null {
  const platform = toDbPlatform(item.source);
  if (!platform) {
    return null;
  }

  return {
    liveSessionId,
    platform,
    platformUserId: item.author.id,
    displayName: item.author.name,
    platformCommentId: item.id,
    commentText: item.text,
    commentType: item.eventType,
    isLowSignal: false,
    commentedAt: item.publishedAt,
  };
}
