import type { CommentViewDto } from "@comment-dock/shared";
import { isLowSignalText } from "../../../../entities/comment";
import type { DbPlatform } from "../../../../entities/live-session/model/types";
import type { QueuedCommentWrite } from "../../model/types";

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
    isLowSignal: isLowSignalText(item.text),
    commentedAt: item.publishedAt,
  };
}
