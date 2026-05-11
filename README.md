# comment-dock

複数の配信サイトから取得したコメントを統合表示する、Tauri ベースのデスクトップアプリです。

## ワークスペース構成

```text
.
├─ apps/
│  └─ desktop/          # デスクトップアプリ本体（React + Tauri）
├─ backend/
│  ├─ auth/             # OAuth ログイン
│  ├─ comment-fetcher/  # 配信コメント取得・正規化
│  └─ comment-delivery/ # コメント配信・中継
├─ packages/
│  └─ shared/           # ランタイム間の共有契約（DTO など）
└─ infra/
   └─ cdk/              # インフラ定義
```

## 開発コマンド（ルート）

- インストール: `pnpm install`
- desktop 開発（Tauri）: `pnpm dev:desktop-tauri`
- backend 配信モック: `pnpm dev:comment-delivery-mock-ws`
- 型チェック（全体）: `pnpm check-types`

## 詳細ドキュメント

- desktop アーキテクチャと運用: [apps/desktop/README.md](apps/desktop/README.md)
- comment-delivery: [backend/comment-delivery/README.md](backend/comment-delivery/README.md)
- auth: [backend/auth/README.md](backend/auth/README.md)
