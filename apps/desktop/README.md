# @comment-dock/desktop

Tauri 2 + React 19 + TypeScript で構成された desktop アプリです。  
フロントエンドは FSD（Feature-Sliced Design）のライト構成で整理しています。

## 技術スタック

- UI: React 19 + Vite
- Desktop Runtime: Tauri 2 (Rust)
- DB: `@tauri-apps/plugin-sql` + SQLite
- テスト: Vitest
- Lint/Format: ESLint + Prettier

## ディレクトリ構成

```text
apps/desktop/
├─ src/
│  ├─ app/                      # アプリ全体の初期化・ライフサイクル
│  ├─ pages/                    # 画面単位のUI
│  ├─ widgets/                  # 画面ブロック（現状は空）
│  ├─ features/                 # ユースケース単位の機能
│  │  ├─ comment-ingestion/     # Gateway WS 受信 -> コメントキュー -> DB永続化
│  │  └─ streaming-session/     # 配信セッション状態・開始停止 hooks
│  ├─ entities/                 # ドメインモデル + repository
│  ├─ shared/                   # 低レベル基盤/共通API/共通UI
│  ├─ app-root.tsx              # ルート構成コンポーネント
│  └─ main.tsx                  # エントリポイント
├─ src-tauri/                   # Rust 側（commands/db など）
└─ README.md
```

## FSD レイヤーの役割

- `app`: Provider、ランタイム起動/停止、アプリ全体設定
- `pages`: 画面単位の UI（例: `home-page`）
- `widgets`: 複数 feature を束ねる UI ブロック
- `features`: ユーザー価値ベースのユースケース
- `entities`: ドメイン概念（comment, user, live-session など）
- `shared`: どのレイヤーからも使う共通資産

依存方向は上から下（`app -> ... -> shared`）のみです。  
`eslint.config.mjs` の `no-restricted-imports` で違反を検出します。

## 主要モジュール

- ランタイム起動: `src/app/providers/runtime-provider.tsx`
- close ハンドリング: `src/app/runtime/lifecycle.ts`
- コメント取り込み機能: `src/features/comment-ingestion/`
- 配信セッション制御: `src/features/streaming-session/`
- Gateway control API client: `src/shared/api/control/`
- Tauri invoke ラッパー: `src/shared/api/tauri/commands.ts`
- SQLite 基盤: `src/shared/api/sqlite/`

## API Gateway との接続

desktop は backend の個別パッケージへ直接接続せず、`api-gateway` の HTTP / WebSocket のみを利用します。

- HTTP: `VITE_API_GATEWAY_HTTP_URL`（既定 `http://127.0.0.1:17332`）
- WebSocket: `VITE_API_GATEWAY_WS_URL`（既定 `ws://127.0.0.1:17331`）
- コメント表示上限: `VITE_COMMENT_STREAM_BUFFER_SIZE`（既定 `500` 件）

HTTP は `src/shared/api/control/` の SDK ファサードから利用し、配信開始・停止・状態取得を行います。WebSocket は `features/comment-ingestion` が購読し、コメントはキューへ、`session.state` は `features/streaming-session` の Context へ流します。

## 開発コマンド

`apps/desktop` 直下、またはルートから `pnpm --filter @comment-dock/desktop ...` で実行します。

- 開発: `pnpm dev`
- Tauri 開発: `pnpm tauri dev`
- ビルド: `pnpm build`
- 型チェック: `pnpm check-types`
- テスト: `pnpm test`
- テスト（watch）: `pnpm test:watch`

## テスト方針（現状）

- `features/comment-ingestion/model` は WS メッセージ分岐とキュー投入を単体テスト
- `features/streaming-session/model` は reducer と session.state event を単体テスト
- `shared/api/control` は Gateway HTTP client の I/O を fetch mock で単体テスト
- `entities/*/api` は DB レイヤーをモックした repository テスト
- まずはユースケースと repository の境界を壊さないことを優先

## Rust 側（src-tauri）

`src-tauri/src/lib.rs` は Builder 組み立てに専念し、責務を分割しています。

- `commands/`: Tauri command
- `db/migrations.rs`: SQLite マイグレーション定義
- `db/url.rs`: DB URL 定義
- `error.rs`: アプリ共通エラー型（拡張用）
