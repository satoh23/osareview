// entities/comment slice の Public API。
// 型（model/types）とリポジトリ（api/）を再エクスポートする。
export { CommentItem } from "./ui/comment-item";
export { CommentTypeBadge } from "./ui/comment-type-badge";
export { MiniComment } from "./ui/mini-comment";
export { StatCard } from "./ui/stat-card";
export {
  formatCommentTime,
  formatCommentType,
  formatSupportLabel,
  formatSupportType,
  formatViewerStatus,
} from "./lib/format";
export type {
  CommentSupport,
  CommentType,
  EnrichedComment,
  InsertCommentInput,
  SupportType,
  ViewerStatus,
} from "./model/types";
export {
  insertComment,
  type InsertCommentResult,
} from "./api/comments.repository";
