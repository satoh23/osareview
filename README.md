# comment-dock

複数の配信サイトから取得したコメントを統合して表示する、デスクトップ向けコメントビューアーです。  
フロントエンドは React + TypeScript + Vite、デスクトップアプリは Tauri 2 を利用しています。

---

## 技術スタック

- **デスクトップアプリ**: Tauri 2 (Rust)
- **フロントエンド**: React 19 + TypeScript + Vite
- **パッケージマネージャ**: pnpm
- **Lint / Format**:
  - ESLint (`@eslint/js`, `typescript-eslint`, `eslint-config-prettier`)
  - Prettier
  - Husky（pre-commit フック）

---

## アーキテクチャ方針

フロントエンドは **Feature-Sliced Design（フィーチャースライスドアーキテクチャ）** をベースに構成します。

- **app**: アプリ全体のエントリポイント・プロバイダ・ルーティングなど
- **shared**: UI コンポーネントやユーティリティなど、ドメインや機能に依存しない共通資産
- **entities**: コメントや配信元などのドメインモデル（型・最小限のロジック）
- **features**: 「コメントを統合表示する」「配信サイトと接続する」「設定を変更する」など、ユーザーのユースケース単位の機能
- **widgets / pages**: 必要に応じて、画面レイアウトやページ単位のコンポーネントを配置

まずは FSD のコア概念だけを採用した **ライト FSD** として設計し、機能追加に応じて細かいレイヤーやセグメントを拡張していきます。

---

## ディレクトリ構成（予定）

### フロントエンド (`src/`)

```text
src/
  app/
    main.tsx        # エントリーポイント
    providers/      # Theme, QueryClient, グローバル状態など

  shared/
    ui/             # Button, Modal など汎用 UI コンポーネント
    lib/            # 共通ユーティリティ関数
    config/         # 定数, 設定値
    types/          # 共通型定義

  entities/
    comment/
      model.ts      # コメントドメインの型, 基本ロジック
      lib.ts
    source/
      model.ts      # 配信サイト種別などのドメインモデル

  features/
    comments-feed/  # 複数サイトのコメント統合表示
      ui/
      model/
      lib/
    source-connect/ # 各配信サイトとの接続/認証 UI
      ui/
      model/
    settings/       # 設定画面
      ui/
      model/

  pages/
    main/
      ui/           # メイン画面 (features の組み合わせ)

  widgets/          # レイアウトや複合コンポーネント（必要になったら追加）
```

### バックエンド / Tauri (`src-tauri/`)

```text
src-tauri/
  src/
    main.rs         # Tauri エントリポイント
    app/
      mod.rs        # コマンド登録など
      commands.rs   # フロントから呼び出される Tauri commands
    domain/
      comment.rs    # コメントドメイン
      source.rs     # 配信サイト種別 / インターフェース
    infra/
      twitch.rs     # 各配信サイト連携の実装（例）
      youtube.rs
      nicolive.rs
    settings/
      config.rs     # アプリ設定の読み書き
```

Tauri 側は、まずは `commands.rs` を API の入り口とし、内部で `domain` / `infra` レイヤーを呼び出す構成をベースに拡張していきます。

---

## 開発方法

### 前提

- Node.js（推奨: 最新 LTS）
- pnpm
- Rust ツールチェーン（`rustup` でインストール）
- Tauri 開発に必要な依存関係  
  （詳細は Tauri 公式ドキュメントを参照）

### インストール

```bash
pnpm install
```

### 開発サーバー（Tauri + Vite）

```bash
pnpm tauri dev
```

Tauri が内部で `pnpm dev` を実行し、Vite 開発サーバーとデスクトップアプリが立ち上がります。

### ビルド

```bash
pnpm tauri build
```

---

## 推奨 IDE / 拡張機能

- Cursor
  - Tauri 拡張機能
  - rust-analyzer
  - ESLint / Prettier 関連拡張
