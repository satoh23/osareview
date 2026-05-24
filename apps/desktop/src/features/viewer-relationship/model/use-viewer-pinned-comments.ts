import { useEffect, useState } from "react";
import { COMMENT_EVENT_TYPES } from "@comment-dock/shared";
import type { CommentSource } from "@comment-dock/shared";
import { listPinnedCommentsByUserId } from "../../../entities/pinned-comment/api/pinned-comments.repository";
import type { PinnedCommentRow } from "../../../entities/pinned-comment/model/types";
import type { EnrichedComment } from "../../../entities/comment";
import { PINNED_COMMENTS_LIMIT } from "../../../entities/viewer-profile/config/limits";
import { markPerf, measurePerf } from "../../../shared/lib";

type ViewerPinnedState = {
  pinned: EnrichedComment[];
  isLoading: boolean;
  error: Error | undefined;
};

export function useViewerPinnedComments(
  userId: number | undefined,
): ViewerPinnedState {
  const [state, setState] = useState<ViewerPinnedState>({
    pinned: [],
    isLoading: Boolean(userId !== undefined),
    error: undefined,
  });

  useEffect(() => {
    if (userId === undefined) {
      setState({ pinned: [], isLoading: false, error: undefined });
      return;
    }

    let isActive = true;
    setState((current) => ({ ...current, isLoading: true, error: undefined }));
    markPerf("viewer-card:pinned-fetch-start");

    void listPinnedCommentsByUserId({ userId, limit: PINNED_COMMENTS_LIMIT })
      .then((rows) => {
        if (!isActive) return;
        markPerf("viewer-card:pinned-fetch-end");
        measurePerf(
          "viewer-card:pinned-fetch",
          "viewer-card:pinned-fetch-start",
          "viewer-card:pinned-fetch-end",
        );
        setState({
          pinned: rows.map(pinnedRowToEnrichedComment),
          isLoading: false,
          error: undefined,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({
          pinned: [],
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

export function pinnedRowToEnrichedComment(
  row: PinnedCommentRow,
): EnrichedComment {
  return {
    id: row.commentId !== null ? String(row.commentId) : `pinned-${row.id}`,
    source: (row.commentPlatform ?? "youtube") as CommentSource,
    author: { id: String(row.userId), name: "" },
    text: row.commentText ?? row.pinnedText,
    publishedAt: row.commentedAt ?? "",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
    viewerStatus: undefined,
    commentTypes: [],
    isLowSignal: false,
    isImportant: false,
    isPinned: true,
    badges: [],
    liveSessionTitle: row.liveSessionTitle ?? undefined,
  };
}
