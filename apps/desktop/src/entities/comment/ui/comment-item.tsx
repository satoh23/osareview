import type { KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Gift, Pin, Star } from "lucide-react";
import { COMMENT_EVENT_TYPES, type CommentViewDto } from "@comment-dock/shared";
import { cx } from "../../../shared/lib";
import { Badge, PlatformIcon } from "../../../shared/ui";
import {
  formatCommentTime,
  formatSupportLabel,
  formatSupportType,
  formatViewerStatus,
} from "../lib/format";
import type { CommentSupport, EnrichedComment } from "../model/types";

type CommentItemProps = {
  comment: CommentViewDto | EnrichedComment;
  selected?: boolean;
  onSelect?: (comment: CommentViewDto | EnrichedComment) => void;
};

export function CommentItem({
  comment,
  onSelect,
  selected = false,
}: CommentItemProps) {
  const displayComment = toDisplayComment(comment);
  const isSupport = Boolean(displayComment.support);
  const isQuestion = displayComment.commentTypes.includes("question");
  const isLongTimeNoSee =
    displayComment.commentTypes.includes("long_time_no_see") ||
    displayComment.viewerStatus === "long_time_no_see";
  const isFirstTime =
    displayComment.viewerStatus === "first_time" ||
    displayComment.commentTypes.includes("first_time");
  const isInteractive = Boolean(onSelect);

  const handleSelect = () => {
    onSelect?.(comment);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onSelect || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }
    event.preventDefault();
    onSelect(comment);
  };

  return (
    <motion.article
      className={cx(
        "group w-full rounded-lg border px-2.5 py-1.5 text-left transition",
        selected
          ? "border-brand-pink-strong/60 bg-brand-pink/10"
          : "border-border bg-elevated/50 hover:border-border-strong hover:bg-surface-muted/70",
        isSupport && "border-brand-gold/50 bg-brand-gold/10",
        isQuestion && !isSupport && "border-info/35 bg-info/5",
        isLongTimeNoSee &&
          !isSupport &&
          !isQuestion &&
          "border-brand-purple/35 bg-brand-purple/5",
        isFirstTime && !isSupport && "border-info/40",
        displayComment.isLowSignal && "opacity-55",
        isInteractive && "cursor-pointer",
      )}
      layout
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={cx(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
            displayComment.source === "youtube"
              ? "bg-red-500/10"
              : "bg-violet-500/10",
          )}
        >
          <PlatformIcon
            platform={displayComment.source}
            className="h-3.5 w-3.5"
          />
        </div>

        <div className="flex min-w-[150px] max-w-[260px] shrink-0 items-center gap-1 overflow-hidden">
          <span className="truncate text-[13px] font-bold text-primary">
            {displayComment.author.name}
          </span>
          {displayComment.badges.slice(0, 1).map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
          <ViewerStatusBadge status={displayComment.viewerStatus} />
          {displayComment.support ? (
            <Badge tone="gold">
              <Gift aria-hidden="true" className="mr-1 h-3 w-3" />
              {formatSupportLabel(displayComment.support)}
            </Badge>
          ) : null}
        </div>

        <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-5 text-primary">
          {displayComment.text}
        </p>

        <div className="ml-2 flex shrink-0 items-center gap-1 text-secondary">
          {displayComment.isPinned ? (
            <Pin
              aria-hidden="true"
              className="h-3.5 w-3.5 text-brand-pink-strong"
            />
          ) : null}
          {displayComment.isImportant ? (
            <Star aria-hidden="true" className="h-3.5 w-3.5 text-brand-gold" />
          ) : null}
          <span className="ml-1 text-[10px] tabular-nums text-muted">
            {formatCommentTime(displayComment.publishedAt)}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function ViewerStatusBadge({
  status,
}: {
  status?: EnrichedComment["viewerStatus"];
}) {
  if (!status || (status !== "first_time" && status !== "supporter")) {
    return null;
  }

  return (
    <Badge tone={status === "supporter" ? "gold" : "blue"}>
      {formatViewerStatus(status)}
    </Badge>
  );
}

const toDisplayComment = (
  comment: CommentViewDto | EnrichedComment,
): EnrichedComment => {
  if (isEnrichedComment(comment)) {
    return comment;
  }

  const support = getSupport(comment);

  return {
    ...comment,
    commentTypes:
      comment.eventType === COMMENT_EVENT_TYPES.NORMAL
        ? ["normal"]
        : ["support"],
    isLowSignal: false,
    isImportant: true,
    isPinned: true,
    support,
    badges: [],
  };
};

const isEnrichedComment = (
  comment: CommentViewDto | EnrichedComment,
): comment is EnrichedComment => "commentTypes" in comment;

const getSupport = (comment: CommentViewDto): CommentSupport | undefined => {
  if (comment.eventType === COMMENT_EVENT_TYPES.SUPER_CHAT) {
    return {
      type: "super_chat",
      amountLabel: comment.monetaryAmount
        ? `${comment.monetaryAmount.currency} ${comment.monetaryAmount.amount}`
        : formatSupportType("super_chat"),
    };
  }
  if (comment.eventType === COMMENT_EVENT_TYPES.SUBSCRIPTION) {
    return {
      type: comment.source === "twitch" ? "sub" : "member",
    };
  }
  return undefined;
};
