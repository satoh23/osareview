import type { CommentSource } from "@comment-dock/shared";
import { formatViewerStatus } from "../../comment";
import type {
  HistoryMode,
  RelationshipTab,
  ViewerProfile,
} from "../model/types";

export function formatPlatformLabel(platform: CommentSource): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "twitch":
      return "Twitch";
  }
}

export function formatRelationshipTab(tab: RelationshipTab): string {
  switch (tab) {
    case "summary":
      return "要約";
    case "memo":
      return "メモ";
    case "all":
      return "全コメント";
  }
}

export function formatHistoryMode(mode: HistoryMode): string {
  switch (mode) {
    case "all":
      return "すべて";
    case "filtered":
      return "リアクション除外";
    case "important":
      return "重要のみ";
  }
}

export function formatViewerProfileStatusSummary(
  profile: ViewerProfile,
): string {
  const statusLabels = profile.statuses
    .map((status) => formatViewerStatus(status))
    .filter(Boolean);

  if (statusLabels.length === 0) {
    return "通常リスナー";
  }
  return statusLabels.join(" / ");
}

export function formatViewerProfileStats(profile: ViewerProfile): string {
  return `${profile.visitCount}回訪問 / ${profile.commentCount}コメント / 支援${profile.supportCount}回`;
}
