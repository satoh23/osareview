import { Pin, Star } from "lucide-react";
import { formatCommentTime } from "../lib/format";
import type { EnrichedComment } from "../model/types";
import { CommentTypeBadge } from "./comment-type-badge";

type MiniCommentProps = {
  comment: EnrichedComment;
};

export function MiniComment({ comment }: MiniCommentProps) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
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
        <span className="text-[11px] text-muted">
          {formatCommentTime(comment.publishedAt)}
        </span>
      </div>
      <p className="text-sm leading-5 text-secondary">{comment.text}</p>
    </div>
  );
}
