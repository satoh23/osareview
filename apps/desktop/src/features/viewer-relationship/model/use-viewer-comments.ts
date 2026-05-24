import { useEffect, useState } from "react";
import { COMMENT_EVENT_TYPES } from "@comment-dock/shared";
import type { CommentSource } from "@comment-dock/shared";
import { listCommentsByUserId } from "../../../entities/comment/api/comments.repository";
import type { CommentHistoryRow } from "../../../entities/comment/api/comments.repository";
import {
  isLowSignalText,
  type EnrichedComment,
} from "../../../entities/comment";
import { VIEWER_PROFILE_HISTORY_LIMIT } from "../../../entities/viewer-profile/config/limits";
import { markPerf, measurePerf } from "../../../shared/lib";

type ViewerCommentsState = {
  comments: EnrichedComment[];
  isLoading: boolean;
  error: Error | undefined;
};

export function useViewerComments(
  userId: number | undefined,
): ViewerCommentsState {
  const [state, setState] = useState<ViewerCommentsState>({
    comments: [],
    isLoading: Boolean(userId !== undefined),
    error: undefined,
  });

  useEffect(() => {
    if (userId === undefined) {
      setState({ comments: [], isLoading: false, error: undefined });
      return;
    }

    let isActive = true;
    setState((current) => ({ ...current, isLoading: true, error: undefined }));
    markPerf("viewer-card:comments-fetch-start");

    void listCommentsByUserId({ userId, limit: VIEWER_PROFILE_HISTORY_LIMIT })
      .then((rows) => {
        if (!isActive) return;
        markPerf("viewer-card:comments-fetch-end");
        measurePerf(
          "viewer-card:comments-fetch",
          "viewer-card:comments-fetch-start",
          "viewer-card:comments-fetch-end",
        );
        setState({
          comments: rows.map(commentRowToEnrichedComment),
          isLoading: false,
          error: undefined,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({
          comments: [],
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      isActive = false;
    };
  }, [userId]);

  return state;
}

export function commentRowToEnrichedComment(
  row: CommentHistoryRow,
): EnrichedComment {
  return {
    id: String(row.id),
    source: row.platform as CommentSource,
    author: { id: row.platformCommentId ?? String(row.id), name: "" },
    text: row.commentText,
    publishedAt: row.commentedAt,
    eventType: COMMENT_EVENT_TYPES.NORMAL,
    viewerStatus: undefined,
    commentTypes: [],
    isLowSignal: row.isLowSignal || isLowSignalText(row.commentText),
    isImportant: false,
    isPinned: false,
    badges: [],
    liveSessionTitle: row.liveSessionTitle ?? undefined,
  };
}
