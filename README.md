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

## ディレクトリ構成（全体像）

このREADMEではワークスペース全体の役割だけを示します。  
各ディレクトリの詳細設計は、必要に応じてそれぞれの配下にREADMEを作成して管理します。

```text
.
├─ apps/
│  └─ desktop/
│     ├─ src/          # フロントエンド（React）
│     └─ src-tauri/    # デスクトップ統合層（Tauri / Rust）
├─ backend/
│  ├─ collector/       # コメント取得・正規化
│  └─ websocket-control/ # コメント配信・中継
├─ packages/
│  └─ shared/          # ランタイム間で共有する契約（DTOなど）
└─ infra/
   └─ cdk/             # インフラ定義
```

### 役割の要点

- `apps`: ユーザーが操作するアプリ本体（UIとデスクトップ統合）
- `backend`: 配信コメント取得や中継など、バックエンド処理本体
- `packages/shared`: `apps` と `backend` が共有する型・契約
- `infra`: デプロイ/運用基盤のコード

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
