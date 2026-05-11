// entities/user slice の Public API。
// 型（model/types）とリポジトリ（api/）を再エクスポートする。
// user-memos / user-tag-links など、user に閉じた関連リソースもここに集約する。
export type {
  LinkUserTagInput,
  UpsertUserInput,
  UpsertUserMemoInput,
} from "./model/types";
export {
  incrementObservedCommentCount,
  upsertUser,
} from "./api/users.repository";
export { upsertUserMemo } from "./api/userMemos.repository";
export {
  linkUserTag,
  unlinkUserTag,
  type LinkUserTagResult,
} from "./api/userTagLinks.repository";
