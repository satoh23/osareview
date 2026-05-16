# api-gateway

desktop が利用するバックエンド入口です。HTTP control plane と WebSocket event plane を同一プロセスで提供し、`comment-fetcher` / `comment-delivery` / `auth` をライブラリとして束ねます。

## 役割

- HTTP:
  - `GET /sessions`
  - `POST /sessions/:platform/start`
  - `POST /sessions/:platform/stop`
- WebSocket:
  - `comments.append`
  - `comments.batch`
  - `session.state`
- 配信開始ボタン押下を起点に `comment-fetcher` の YouTube / Twitch pipeline を起動
- 取得コメントを `comment-delivery` の変換・装飾パイプラインへ渡し、WebSocket で desktop へ配信
- セッション状態を platform ごとに保持し、新規 WebSocket 接続時に状態スナップショットを送信

## 実行

リポジトリルート:

```bash
pnpm dev:api-gateway
```

`backend/api-gateway` 直下:

```bash
pnpm dev
```

desktop とまとめて起動する場合は、ルートで次を実行します。

```bash
pnpm dev
```

## 環境変数

`.env.example` を参考にルート `.env` を作成してください。

```env
API_GATEWAY_HTTP_HOST=127.0.0.1
API_GATEWAY_HTTP_PORT=17332
API_GATEWAY_WS_HOST=127.0.0.1
API_GATEWAY_WS_PORT=17331

VITE_API_GATEWAY_HTTP_URL=http://127.0.0.1:17332
VITE_API_GATEWAY_WS_URL=ws://127.0.0.1:17331

LIVE_STREAM_POLLING_INTERVAL_MS=5000
LIVE_STREAM_MAX_ATTEMPTS=5
```

YouTube / Twitch の認証設定とログインも必要です。未ログインの場合、配信開始時に token missing / unauthorized 系のエラーで `failed` になります。

```bash
pnpm --filter @comment-dock/auth login youtube
pnpm --filter @comment-dock/auth login twitch
```

## セッション状態

Gateway は platform ごとに状態を管理します。

- `idle`: 未接続
- `connecting`: 配信検知・接続中
- `connected`: コメント取得中
- `failed`: 接続失敗

`failed` は短時間表示後、自動で `idle` に戻ります。

## 動作確認

1. `pnpm dev` で desktop と api-gateway を起動
2. Home で YouTube / Twitch の「配信開始」を押す
3. 状態が `未接続` から `接続中…` へ変わることを確認
4. 配信中なら `接続済` になり、コメントが流れることを確認
5. 非配信または未ログインなら `接続失敗` になり、その後 `未接続` に戻ることを確認
6. 「停止」で即時 `未接続` に戻ることを確認

## テスト / 型チェック

```bash
pnpm --filter @comment-dock/api-gateway test
pnpm --filter @comment-dock/api-gateway check-types
```
