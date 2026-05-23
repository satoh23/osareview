export const COMMENT_DELIVERY_WS_WARN_MESSAGES = {
  FAILED_TO_ENQUEUE_COMMENT_FROM_WEBSOCKET:
    "[desktop] WebSocket で受信したコメントを保存キューへ追加できませんでした。",
  FAILED_TO_NOTIFY_COMMENT_LISTENER:
    "[desktop] コメント受信通知の処理中に問題が発生しました。",
  FAILED_TO_NOTIFY_COMMENTS_LISTENER:
    "[desktop] コメント一括受信通知の処理中に問題が発生しました。",
} as const;
