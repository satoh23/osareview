# @comment-dock/auth

YouTube OAuth2 (Authorization Code + PKCE) とトークン保管を担当するライブラリです。

## 役割

- ログインフロー (`login`)
- 有効なアクセストークンの取得 (`getValidAccessToken`)
- 明示 refresh (`refresh`)
- ログアウト (`logout`)

`comment-fetcher` など利用側は、トークン値や refresh の詳細を知らずに `AuthClient` だけを使います。

## 必要な環境変数

ルート `.env` に以下を設定してください。

```env
YOUTUBE_OAUTH_CLIENT_ID=
# Optional overrides
# YOUTUBE_OAUTH_AUTHORIZATION_ENDPOINT=https://accounts.google.com/o/oauth2/v2/auth
# YOUTUBE_OAUTH_TOKEN_ENDPOINT=https://oauth2.googleapis.com/token
# YOUTUBE_OAUTH_SCOPES=https://www.googleapis.com/auth/youtube.readonly
```

## 使い方（ライブラリ）

```ts
import { createAuthClient } from "@comment-dock/auth";

const authClient = createAuthClient();
await authClient.login("youtube");
const accessToken = await authClient.getValidAccessToken("youtube");
```

## 使い方（CLI）

初期セットアップや動作確認で使えます。

```bash
pnpm --filter @comment-dock/auth login youtube
pnpm --filter @comment-dock/auth logout youtube
```

## エラー

- `NotAuthorizedError`
  - 未ログイン、または refresh 失敗で再ログインが必要な状態
