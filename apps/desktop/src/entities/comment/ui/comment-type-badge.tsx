import { Badge, type BadgeProps } from "../../../shared/ui";
import { formatCommentType } from "../lib/format";
import type { CommentType } from "../model/types";

type CommentTypeBadgeProps = {
  type: CommentType;
};

const COMMENT_TYPE_TONES: Record<CommentType, BadgeProps["tone"]> = {
  question: "blue",
  first_time: "default",
  long_time_no_see: "default",
  support: "pink",
  thanks: "pink",
  praise: "pink",
  self_disclosure: "purple",
  low_signal: "muted",
  caution: "red",
  normal: "default",
};

export function CommentTypeBadge({ type }: CommentTypeBadgeProps) {
  if (type === "normal") {
    return null;
  }

  return (
    <Badge tone={COMMENT_TYPE_TONES[type]}>{formatCommentType(type)}</Badge>
  );
}
