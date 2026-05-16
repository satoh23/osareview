// features/comment-ingestion slice の Public API。
// WS 受信〜キュー〜DB 書き込みのエントリ関数（例: startCommentIngestion）を
// ここから再エクスポートする。
export type {
  CommentIngestionRuntime,
  CommentDeliveryWsClientOptions,
} from "./model/comment-delivery-ws-client";
export { createCommentIngestionRuntime } from "./model/comment-delivery-ws-client";
export type { QueuedCommentWrite } from "./model/types";
