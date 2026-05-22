import type {
  CommentSupport,
  CommentType,
  SupportType,
  ViewerStatus,
} from "../model/types";

export function formatViewerStatus(status?: ViewerStatus): string {
  switch (status) {
    case "first_time":
      return "初見";
    case "second_time":
      return "2回目";
    case "regular":
      return "常連";
    case "long_time_no_see":
      return "久しぶり";
    case "supporter":
      return "支援あり";
    default:
      return "";
  }
}

export function formatCommentType(type: CommentType): string {
  switch (type) {
    case "question":
      return "質問";
    case "first_time":
      return "初見";
    case "long_time_no_see":
      return "久しぶり";
    case "support":
      return "応援";
    case "thanks":
      return "感謝";
    case "praise":
      return "褒め";
    case "self_disclosure":
      return "自己開示";
    case "low_signal":
      return "低シグナル";
    case "caution":
      return "注意";
    default:
      return "通常";
  }
}

export function formatSupportType(type: SupportType): string {
  switch (type) {
    case "super_chat":
      return "Super Chat";
    case "member":
      return "Member";
    case "bits":
      return "Bits";
    case "sub":
      return "Sub";
  }
}

export function formatSupportLabel(support: CommentSupport): string {
  return support.amountLabel ?? formatSupportType(support.type);
}

export function formatCommentTime(publishedAt: string): string {
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return publishedAt;
  }
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
