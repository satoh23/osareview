import type {
  CommentEventType,
  CommentSource,
  CommentViewDto,
} from "@comment-dock/shared";
import styles from "./comment-item.module.css";

type CommentItemProps = {
  comment: CommentViewDto;
};

const PLATFORM_LABELS: Record<CommentSource, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
};

const EVENT_LABELS: Record<CommentEventType, string> = {
  normal: "通常",
  super_chat: "Super Chat",
  subscription: "Subscription",
};

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <article className={styles.item}>
      <div className={styles.header}>
        <span className={styles.platformBadge}>
          {PLATFORM_LABELS[comment.source]}
        </span>
        <span className={styles.author}>{comment.author.name}</span>
        <span className={styles.eventBadge}>
          {EVENT_LABELS[comment.eventType]}
        </span>
        {comment.monetaryAmount ? (
          <span className={styles.amountBadge}>
            {formatMonetaryAmount(comment.monetaryAmount)}
          </span>
        ) : null}
      </div>
      <p className={styles.text}>{comment.text}</p>
    </article>
  );
}

const formatMonetaryAmount = (
  monetaryAmount: CommentViewDto["monetaryAmount"],
): string => {
  if (!monetaryAmount) {
    return "";
  }
  return `${monetaryAmount.currency} ${monetaryAmount.amount}`;
};
