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

リポジトリは pnpm workspace のルートです。デスクトップアプリ（Vite + Tauri）は `apps/desktop/` にあります。

### フロントエンド (`apps/desktop/src/`)

```text
apps/desktop/src/
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

### バックエンド / Tauri (`apps/desktop/src-tauri/`)

```text
apps/desktop/src-tauri/
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

## 実装配置ポリシー（スライスアーキテクチャ）

本プロダクトは、UI だけでなくワークスペース全体でも **スライスアーキテクチャ** を採用します。  
「何の関心事を扱うコードか」を基準に配置し、実行環境（フロントエンド / ネイティブ / サービス）ごとに責務を分離します。

### 1) `apps/desktop/src/`（UI スライス）

ユーザー操作と表示に関わる実装を配置します。

- `app/`: エントリーポイント、プロバイダ、ルーティング
- `pages/` / `widgets/`: 画面構成やレイアウト
- `features/`: ユースケース単位の UI ロジック
- `entities/`: 画面で扱うドメインモデル
- `shared/`: UI 基盤、共通ユーティリティ、型、設定

### 2) `services/collector/src/`（収集・正規化スライス）

外部との通信やイベント購読など、常時稼働を想定する処理を配置します。  
取得したデータはここで共通フォーマットに寄せ、上位層へ受け渡します。

- `app/`: サービス起動、DI、設定ロード
- `processes/`: 接続ライフサイクル、再接続、購読管理
- `adapters/`: 外部接続ごとの I/O 実装
- `entities/`: サービス側ドメインモデル
- `shared/`: ロガー、共通型、エラーハンドリング、ユーティリティ

### 3) `services/websocket-control/src/`（配信スライス）

フロントエンドや他プロセスへデータを中継する境界を配置します。  
接続管理と配信プロトコルの責務を、収集処理と分離します。

- `app/`: サーバー起動、設定、終了処理
- `processes/`: セッション管理、接続状態管理
- `adapters/`: WebSocket 入出力、シリアライズ実装
- `shared/`: メッセージスキーマ、共通ユーティリティ

### 4) `apps/desktop/src-tauri/src/`（ネイティブ統合スライス）

デスクトップアプリとして必要なネイティブ統合を配置します。  
OS 機能、アプリ設定、プロセス制御、フロントとの境界はここで扱います。

- `app/`: Tauri command 登録、アプリ初期化
- `processes/`: サービスプロセス起動・監視・停止
- `adapters/`: OS 連携、永続化、セキュア情報アクセス
- `entities/`: ネイティブ側で扱うモデル
- `shared/`: 共通エラー、ユーティリティ、型変換

### 5) `packages/shared/src/`（共有契約スライス）

ランタイムをまたいで共有する契約を配置します。

- プロセス間メッセージ型
- DTO / スキーマ
- バリデーション
- 共有ユーティリティ（副作用を持たないもの）

### 6) `infra/cdk/`（インフラスライス）

クラウドや運用基盤の定義を配置します。  
アプリ本体のロジックは持ち込まず、デプロイ・運用に閉じたコードを維持します。

### 配置ルール

- 同じ関心事のコードは、実行環境をまたいでも同名スライスでそろえる
- `app` はオーケストレーション専用とし、ビジネスロジックを持たせない
- I/O は `adapters` に閉じ込め、ドメインモデルは `entities` に集約する
- 共有したい契約は `packages/shared` に置き、逆方向依存を作らない
- 新規実装は「どのスライスの責務か」を先に決めてから配置する

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
