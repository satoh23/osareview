// entities/support-event slice の Public API。
// 型（model/types）とリポジトリ（api/）を再エクスポートする。
export type { InsertSupportEventInput } from "./model/types";
export { insertSupportEvent } from "./api/supportEvents.repository";
