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

## テストコメント注入

本番の `comment-fetcher` なしで、desktop が受け取るコメントをローカルから注入できます。`DeliverCommentsUseCase` → `DecorationPipeline` → WebSocket という本番と同じ経路を通るため、Decorator の動作確認や負荷試験にも使えます。

### 有効化

ルート `.env` に次の行を追加します（既定は `false`）。

```env
API_GATEWAY_ENABLE_TEST_INJECT=true
```

有効化されると起動ログに通知が出ます。**本番環境では `false` のままにしてください。**

### エンドポイント

```
POST http://<API_GATEWAY_HTTP_HOST>:<API_GATEWAY_HTTP_PORT>/test/comments
Content-Type: application/json

{ "comments": [ ...Comment[] ] }
```

レスポンス: `{ "accepted": <number> }`

フラグが `false` の場合はルート自体が存在しないため 404 になります。

### 注入スクリプト

リポジトリルート:

```bash
pnpm dev:inject-test-comments
```

`backend/api-gateway` 直下:

```bash
pnpm dev:inject
```

オプションは `--` の後に `--key=value` 形式で渡します。

```bash
pnpm dev:inject-test-comments -- --mps=10 --batch=1 --max=100
```

### オプション一覧

| オプション | 既定                             | 説明                                                                                 |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| `host`     | `127.0.0.1`                      | api-gateway の HTTP ホスト                                                           |
| `port`     | `17332`                          | api-gateway の HTTP ポート                                                           |
| `path`     | `/test/comments`                 | 注入エンドポイントのパス                                                             |
| `mps`      | `50`                             | 1秒あたりの送信回数（メッセージ単位）                                                |
| `batch`    | `1`                              | 1メッセージ内のコメント数。`1` のとき `comments.append`、`2` 以上で `comments.batch` |
| `max`      | `5000`                           | 送るコメント総数の上限                                                               |
| `sources`  | `youtube,twitch`                 | カンマ区切り。`youtube` と / または `twitch`                                         |
| `events`   | `normal,super_chat,subscription` | カンマ区切り。`normal` / `super_chat` / `subscription`                               |

### 例

YouTube のみ・通常コメントのみ・低速:

```bash
pnpm dev:inject-test-comments -- --sources=youtube --events=normal --mps=5
```

高速・バッチ・大量:

```bash
pnpm dev:inject-test-comments -- --mps=200 --batch=5 --max=10000
```

実配信と並行して流す場合は、api-gateway を起動したまま別ターミナルでスクリプトを実行します。テストコメントと実コメントが混在して desktop に表示されます。

## テスト / 型チェック

```bash
pnpm --filter @comment-dock/api-gateway test
pnpm --filter @comment-dock/api-gateway check-types
```
