# comment-fetcher

配信プラットフォーム（YouTube / Twitch）からコメントを取得し、共通ドメインへ正規化して出力するバックエンドです。  
現在は `console` 出力までを担い、将来的に認証認可（OAuth2 + PKCE）や配信先拡張を想定した構成になっています。

## バックエンド全体の関係図

```mermaid
flowchart LR
  subgraph External["External Services"]
    YT["YouTube API"]
    TW["Twitch Helix / EventSub"]
    KC["OS Keychain"]
  end

  subgraph Backend["backend/*"]
    AUTH["auth\nOAuth login / token refresh"]
    FETCHER["comment-fetcher\n配信検知・コメント取得・共通化"]
    DELIVERY["comment-delivery\n装飾・WebSocket 配信"]
  end

  UI["desktop (frontend)"]

  YT --> FETCHER
  TW --> FETCHER
  FETCHER --> DELIVERY
  DELIVERY --> UI
  AUTH --> KC
  FETCHER --> AUTH
  DELIVERY --> FETCHER
```

```mermaid
flowchart TD
  subgraph Fetcher["comment-fetcher 内部"]
    A["app/main\nprovider pipeline orchestration"]
    U1["usecases/live-stream-detection"]
    U2["usecases/comment-collection"]
    R["adapters/*/repository"]
    C["adapters/*/client"]
    CFG["infrastructure/* config"]
    E["entities/comment, user"]
  end

  A --> U1
  A --> U2
  U1 --> R
  U2 --> R
  R --> C
  C --> CFG
  U2 --> E
```

- `auth`: 各 provider の OAuth を担当し、トークンを安全に保存（Keychain）。
- `comment-fetcher`: 外部APIと直接やり取りしてコメントを取得し、共通ドメインへ正規化。
- `comment-delivery`: `comment-fetcher` をソースとして受け、必要なら装飾して WebSocket で配信。
- `desktop`: `comment-delivery` の WebSocket を購読して表示するクライアント。

## 実行

リポジトリルートで実行します。

```bash
pnpm dev:comment-fetcher
```

`backend/comment-fetcher` 直下で実行する場合:

```bash
pnpm dev
```

## 必要な環境変数

最低限、利用する provider 側の設定が必要です。

```env
# YouTube OAuth (backend/auth)
YOUTUBE_OAUTH_CLIENT_ID=
YOUTUBE_OAUTH_CLIENT_SECRET=
# YOUTUBE_OAUTH_AUTHORIZATION_ENDPOINT=https://accounts.google.com/o/oauth2/v2/auth
# YOUTUBE_OAUTH_TOKEN_ENDPOINT=https://oauth2.googleapis.com/token
# YOUTUBE_OAUTH_SCOPES=https://www.googleapis.com/auth/youtube.readonly

# Twitch
TWITCH_CLIENT_ID=
TWITCH_TARGET_CHANNEL_ID=   # login 名（例: twitchdev）

# Optional
# TWITCH_HELIX_API_BASE_URL=https://api.twitch.tv/helix
# TWITCH_EVENTSUB_WS_URL=wss://eventsub.wss.twitch.tv/ws
```

YouTube / Twitch ともにアクセストークンを直接設定せず、`@comment-dock/auth` を通して OAuth ログインします。
初回は次を実行してください。

```bash
pnpm --filter @comment-dock/auth login youtube
pnpm --filter @comment-dock/auth login twitch
```

## ディレクトリ構成

`src` 配下は Clean Architecture / FSD を意識して分割しています。

- `app/`
  - 実行オーケストレーション（pipeline 構築、provider 並列実行）
- `usecases/`
  - アプリケーションルール
  - `live-stream-detection/`: 配信中検出
  - `comment-collection/`: コメント収集（YouTube / Twitch）
- `adapters/`
  - 外部仕様との変換・接続
  - `youtube/`, `twitch/`: provider 固有実装
  - `presenters/`: 出力用アダプター
- `entities/`
  - provider 非依存ドメイン（`Comment`, `User`）
- `infrastructure/`
  - 低レイヤ設定・抽象
  - `shared/`: 共通契約（`HttpClient`, `AccessTokenProvider` など）
  - `youtube/`, `twitch/`: provider 設定値

## アーキテクチャ方針

- **依存方向は内側へ**
  - `usecases` は `repository interface` に依存
  - `adapters` がその interface を実装
- **provider 詳細は adapter に閉じる**
  - YouTube Data API / Twitch Helix + EventSub DTO は `adapters/*/dto` に限定
- **共通ドメインで統一**
  - 取得結果は `entities/comment` に正規化
- **DI 前提**
  - `tsyringe` で実装差し替えを容易化
  - 例: `HttpClient` はトークン定義 + `index.ts` で `fetch` を登録

## 実装ポリシー

- mapper で「外部イベント -> 共通 Comment」へ変換し、未対応イベントは明示的に除外
- repository は「クライアントのストリーム/レスポンスをユースケース契約に合わせる薄い層」
- usecase は再接続制御やポーリングなどの業務フローを担当

## Twitch 実装の要点

- リアルタイム取得: EventSub WebSocket
- サブスク作成: Helix `eventsub/subscriptions`
- 購読イベント:
  - `channel.chat.message`
  - `channel.chat.notification`
- `Client-Id` と `Bearer token` を常に併用
- `session_keepalive` など通知系メッセージは受信しても処理対象外として無視

## テスト / 型チェック

```bash
pnpm --filter @comment-dock/comment-fetcher test
pnpm --filter @comment-dock/comment-fetcher check-types
```

## 今後の主タスク

- provider ごとの障害分離（片系エラー時も他系継続）
- コメントポリシー拡張（例: Twitch 絵文字のみ投稿の扱い）
