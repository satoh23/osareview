import { useMemo } from "react";
import type { CommentViewDto } from "@comment-dock/shared";
import { useCommentStreamFilter } from "../../comment-stream-filter";
import { enrichComments, type EnrichedComment } from "./comment-classifier";
import { useCommentStream } from "./comment-stream-context";

export const getFilteredEnrichedComments = (
  comments: readonly CommentViewDto[],
  hideLowSignal: boolean,
): EnrichedComment[] => {
  const enrichedComments = enrichComments(comments);
  if (!hideLowSignal) {
    return enrichedComments;
  }
  return enrichedComments.filter((comment) => !comment.isLowSignal);
};

export function useEnrichedComments(): EnrichedComment[] {
  const comments = useCommentStream();
  const { hideLowSignal } = useCommentStreamFilter();

  return useMemo(
    () => getFilteredEnrichedComments(comments, hideLowSignal),
    [comments, hideLowSignal],
  );
}
