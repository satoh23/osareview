import { insertComment } from "../../entities/comment/api/comments.repository";
import { upsertLiveSessionUser } from "../../entities/live-session/api/liveSessionUsers.repository";
import {
  incrementObservedCommentCount,
  upsertUser,
} from "../../entities/user/api/users.repository";
import {
  toInsertCommentInput,
  toUpsertLiveSessionUserInput,
  toUpsertUserInput,
} from "../converters/queued-comment-write.converter";
import type { QueuedCommentWrite } from "../../entities/comment/model/types";

/**
 * キューに載せたコメントを1件永続化する。共有 DB で呼び出し元がトランザクションを
 * 開いている間に実行すること（`CommentWriteQueue.flush` が BEGIN … COMMIT を使う）。
 */
export async function persistQueuedCommentWrite(
  item: QueuedCommentWrite,
): Promise<void> {
  const userId = await upsertUser(toUpsertUserInput(item));
  const commentResult = await insertComment(toInsertCommentInput(item, userId));

  if (!commentResult.inserted) {
    return;
  }

  await upsertLiveSessionUser(toUpsertLiveSessionUserInput(item, userId));
  await incrementObservedCommentCount(userId);
}
