// entities/comment slice の Public API。
// 型（model/types）とリポジトリ（api/）を再エクスポートする。
export { CommentItem } from "./ui/comment-item";
export type { InsertCommentInput } from "./model/types";
export {
  insertComment,
  type InsertCommentResult,
} from "./api/comments.repository";
