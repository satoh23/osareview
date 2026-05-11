// entities/pinned-comment slice の Public API。
// 型（model/types）とリポジトリ（api/）を再エクスポートする。
export type { InsertPinnedCommentInput } from "./model/types";
export {
  insertPinnedComment,
  type InsertPinnedCommentResult,
} from "./api/pinnedComments.repository";
