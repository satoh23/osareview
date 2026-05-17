# @comment-dock/auth

YouTube / Twitch OAuth とトークン保管を担当するライブラリです。

## 役割

- ログインフロー (`login`)
- 連携状態の取得 (`getLinkStatus`)
- 有効なアクセストークンの取得 (`getValidAccessToken`)
- 認証付き REST 呼び出しの refresh + retry (`withAuthorizedRequest`)
- 明示 refresh (`refresh`)
- ログアウト (`logout`)

`comment-fetcher` など利用側は、トークン値や refresh の詳細を知らずに `AuthClient` だけを使います。

## 必要な環境変数

ルート `.env` に以下を設定してください。

```env
YOUTUBE_OAUTH_CLIENT_ID=
YOUTUBE_OAUTH_CLIENT_SECRET=
# Optional overrides
# YOUTUBE_OAUTH_AUTHORIZATION_ENDPOINT=https://accounts.google.com/o/oauth2/v2/auth
# YOUTUBE_OAUTH_TOKEN_ENDPOINT=https://oauth2.googleapis.com/token
# YOUTUBE_OAUTH_SCOPES=https://www.googleapis.com/auth/youtube.readonly

TWITCH_CLIENT_ID=
# Optional overrides
# TWITCH_OAUTH_DEVICE_AUTHORIZATION_ENDPOINT=https://id.twitch.tv/oauth2/device
# TWITCH_OAUTH_TOKEN_ENDPOINT=https://id.twitch.tv/oauth2/token
# TWITCH_OAUTH_SCOPES=user:read:chat
```

## 使い方（ライブラリ）

```ts
import { createAuthClient } from "@comment-dock/auth";

const authClient = createAuthClient();
await authClient.login("youtube");
const status = await authClient.getLinkStatus("youtube");
const accessToken = await authClient.getValidAccessToken("youtube");
```

REST API 呼び出しでは、呼び出し側が 401 を検知したら `UnauthorizedRequestError` を投げます。`withAuthorizedRequest` は refresh して 1 回だけリトライし、refresh も失敗した場合は `NotAuthorizedError` に正規化します。

```ts
import { UnauthorizedRequestError, createAuthClient } from "@comment-dock/auth";

const authClient = createAuthClient();
const result = await authClient.withAuthorizedRequest(
  "youtube",
  async (token) => {
    const response = await fetch("https://www.googleapis.com/youtube/v3/...", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      throw new UnauthorizedRequestError();
    }
    return response.json();
  },
);
```

Twitch も同じ API で利用できます。

```ts
const authClient = createAuthClient();
await authClient.login("twitch");
const accessToken = await authClient.getValidAccessToken("twitch");
```

## 使い方（CLI）

初期セットアップや動作確認で使えます。

```bash
pnpm --filter @comment-dock/auth login youtube
pnpm --filter @comment-dock/auth logout youtube
pnpm --filter @comment-dock/auth login twitch
pnpm --filter @comment-dock/auth logout twitch
```

## Twitch セットアップ（Device Code Flow）

Twitch は Desktop/Electron 系クライアント向けに Device Code Flow を使います。  
`client_secret` は使いません（`TWITCH_OAUTH_CLIENT_SECRET` は不要です）。

1. Twitch Developer Console でアプリを Public client として作成する
2. ルート `.env` に `TWITCH_CLIENT_ID` を設定する
3. ログインを実行する

```bash
pnpm --filter @comment-dock/auth login twitch
```

実行後、ブラウザで認可を完了すると token が保存されます。

## エラー

- `NotAuthorizedError`
  - 未ログイン、または refresh 失敗で再ログインが必要な状態

## YouTube refresh token の運用注意

Google Cloud Console の OAuth consent screen が Testing のままだと、YouTube の `refresh_token` は 7 日で失効します。実装で延長できないため、継続利用には OAuth consent screen を Production に公開してください。
