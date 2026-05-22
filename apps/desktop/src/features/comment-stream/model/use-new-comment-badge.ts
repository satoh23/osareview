import { useCallback, useEffect, useRef, useState } from "react";
import type { CommentViewDto } from "@comment-dock/shared";

type UseNewCommentBadgeOptions = {
  comments: readonly CommentViewDto[];
  isAutoFollowing: boolean;
};

type NewCommentBadgeState = {
  newCommentCount: number;
  hasNewComments: boolean;
  resetNewCommentCount: () => void;
};

export const countIncomingComments = (
  knownCommentIds: ReadonlySet<string>,
  comments: readonly Pick<CommentViewDto, "id">[],
): number =>
  comments.reduce(
    (count, comment) => count + (knownCommentIds.has(comment.id) ? 0 : 1),
    0,
  );

export function useNewCommentBadge({
  comments,
  isAutoFollowing,
}: UseNewCommentBadgeOptions): NewCommentBadgeState {
  const [newCommentCount, setNewCommentCount] = useState(0);
  const knownCommentIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const nextCommentIds = new Set(comments.map((comment) => comment.id));
    const knownCommentIds = knownCommentIdsRef.current;

    if (!knownCommentIds) {
      knownCommentIdsRef.current = nextCommentIds;
      return;
    }

    const incomingCount = countIncomingComments(knownCommentIds, comments);

    knownCommentIdsRef.current = nextCommentIds;

    if (isAutoFollowing) {
      setNewCommentCount(0);
      return;
    }
    if (incomingCount > 0) {
      setNewCommentCount((current) => current + incomingCount);
    }
  }, [comments, isAutoFollowing]);

  const resetNewCommentCount = useCallback(() => {
    setNewCommentCount(0);
  }, []);

  return {
    newCommentCount,
    hasNewComments: newCommentCount > 0,
    resetNewCommentCount,
  };
}
