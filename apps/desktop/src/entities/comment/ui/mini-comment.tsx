import { Pin, Star } from "lucide-react";
import { formatCommentDateTime } from "../lib/format";
import type { EnrichedComment } from "../model/types";
import { CommentTypeBadge } from "./comment-type-badge";

type MiniCommentProps = {
  comment: EnrichedComment;
};

export function MiniComment({ comment }: MiniCommentProps) {
  const sessionTitle = comment.liveSessionTitle ?? "（タイトル未取得）";
  const hasBadges =
    comment.isPinned || comment.isImportant || comment.commentTypes.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted">
        <span className="min-w-0 flex-1 truncate">{sessionTitle}</span>
        <span className="shrink-0">
          {formatCommentDateTime(comment.publishedAt)}
        </span>
      </div>
      {hasBadges ? (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {comment.isPinned ? (
            <Pin
              aria-hidden="true"
              className="h-3.5 w-3.5 text-brand-pink-strong"
            />
          ) : null}
          {comment.isImportant ? (
            <Star aria-hidden="true" className="h-3.5 w-3.5 text-brand-gold" />
          ) : null}
          {comment.commentTypes.slice(0, 2).map((type) => (
            <CommentTypeBadge key={type} type={type} />
          ))}
        </div>
      ) : null}
      <p className="text-sm leading-5 text-secondary">{comment.text}</p>
    </div>
  );
}
