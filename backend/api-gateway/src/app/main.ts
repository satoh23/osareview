export const runApiGateway = async (): Promise<void> => {
  // HTTP / WebSocket サーバの起動処理は後続タスクでここに接続する。
  // パッケージ初期化時点でも型チェックと起動確認ができるように、
  // 先に Gateway の実行エントリだけ用意している。
  console.info("[api-gateway] initialized");
};
