# comment-dock

複数の配信サイトから取得したコメントを統合表示する、Tauri ベースのデスクトップアプリです。

## ワークスペース構成

```text
.
├─ apps/
│  └─ desktop/          # デスクトップアプリ本体（React + Tauri）
├─ backend/
│  ├─ api-gateway/      # desktop 向け HTTP/WS 入口（REST 制御 + イベント配信）
│  ├─ auth/             # OAuth ログイン
│  ├─ comment-fetcher/  # 配信コメント取得・正規化
│  └─ comment-delivery/ # コメント装飾・UI DTO 変換ライブラリ
├─ packages/
│  └─ shared/           # ランタイム間の共有契約（DTO など）
└─ infra/
   └─ cdk/              # インフラ定義
```

## 開発コマンド（ルート）

- インストール: `pnpm install`
- desktop + api-gateway 開発: `pnpm dev`
- desktop 開発（Tauri のみ）: `pnpm dev:desktop-tauri`
- api-gateway 開発: `pnpm dev:api-gateway`
- テストコメント注入: `pnpm dev:inject-test-comments`（詳細: [backend/api-gateway/README.md](backend/api-gateway/README.md#テストコメント注入)）
- 型チェック（全体）: `pnpm check-types`

## 詳細ドキュメント

- desktop アーキテクチャと運用: [apps/desktop/README.md](apps/desktop/README.md)
- backend 構成: [backend/README.md](backend/README.md)
- api-gateway: [backend/api-gateway/README.md](backend/api-gateway/README.md)
- comment-delivery: [backend/comment-delivery/README.md](backend/comment-delivery/README.md)
- auth: [backend/auth/README.md](backend/auth/README.md)
