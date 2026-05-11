// entities/tag slice の Public API。
// 型（model/types）とリポジトリ（api/）を再エクスポートする。
export type { CreateTagInput, DeleteTagInput } from "./model/types";
export {
  createTag,
  deleteTag,
  type CreateTagResult,
} from "./api/tags.repository";
