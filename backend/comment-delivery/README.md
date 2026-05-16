# comment-delivery

`comment-fetcher` が取得したコメントを受け取り、装飾パイプラインを通して UI 向けの DTO へ変換するライブラリです。

本番の WebSocket サーバは `backend/api-gateway` 側にあります。`comment-delivery` 自体は単独プロセスとして起動せず、Gateway から `DeliverCommentsUseCase` を呼び出して利用します。

現在の既定構成は次のとおりです。

- Decorator: `IdentityDecorator`（no-op）
- Sink: `MultiCommentOutputPort`（既定は `ConsoleCommentOutputPort`。Gateway では `api-gateway` 側の WebSocket 出力ポートを追加登録）

## 利用方法

`comment-delivery` は単独プロセスとしては起動せず、Gateway などの呼び出し元から `DeliverCommentsUseCase` を利用します。

```ts
import {
  DeliverCommentsUseCase,
  registerCommentDeliveryDependencies,
} from "@comment-dock/comment-delivery";
import { container } from "tsyringe";

registerCommentDeliveryDependencies();

const deliverCommentsUseCase = container.resolve(DeliverCommentsUseCase);
await deliverCommentsUseCase.deliverComments(comments);
```

Gateway では fetcher の `outputComments` から `deliverComments()` を直接呼び、余分な queue / async generator を挟まない構成にしています。変換後の DTO は Gateway の WebSocket 出力ポートから desktop へ送信されます。

## テスト用モック WebSocket サーバー

本番の `comment-fetcher` なしで、desktop が受け取る **本番と同じ形式**（`comments.append` / `comments.batch`）のメッセージを高速に流せます。負荷試験・イベント種別の確認・YouTube/Twitch 同時流入の確認に使います。

**注意:** 既定ポートは `api-gateway` の WebSocket と同じ `17331` です。Gateway など同じポートを使うプロセスを止めてから起動してください（ポート競合します）。

### 起動コマンド

リポジトリルート:

```bash
pnpm dev:comment-delivery-mock-ws
```

`backend/comment-delivery` 直下:

```bash
pnpm dev:mock-ws
```

フィルタ指定:

```bash
pnpm --filter @comment-dock/comment-delivery dev:mock-ws
```

オプションは **`--` の後**に `--key=value` 形式で渡します（pnpm がスクリプトへそのまま渡すため）。

```bash
pnpm dev:comment-delivery-mock-ws -- --mps=200 --batch=3 --max=10000
```

### オプション一覧

| オプション | 既定                             | 説明                                                                                   |
| ---------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| `host`     | `127.0.0.1`                      | 待ち受けホスト                                                                         |
| `port`     | `17331`                          | 待ち受けポート（desktop の `VITE_API_GATEWAY_WS_URL` と揃える）                        |
| `mps`      | `50`                             | 1秒あたりの **送信回数**（メッセージ単位。`batch` 大きいと実コメント数はさらに増える） |
| `batch`    | `1`                              | 1メッセージ内のコメント数。`1` のとき `comments.append`、`2` 以上で `comments.batch`   |
| `max`      | `5000`                           | 送る **コメント総数** の上限（`batch` ごとに加算）                                     |
| `sources`  | `youtube,twitch`                 | カンマ区切り。`youtube` と / または `twitch`                                           |
| `events`   | `normal,super_chat,subscription` | カンマ区切り。`normal` / `super_chat` / `subscription`（順番にローテーション）         |

### 例

高速・バッチ・大量:

```bash
pnpm dev:comment-delivery-mock-ws -- --mps=300 --batch=5 --max=20000
```

YouTube のみ・通常コメントのみ:

```bash
pnpm dev:comment-delivery-mock-ws -- --sources=youtube --events=normal --mps=100
```

スパチャとサブスクだけ混在:

```bash
pnpm dev:comment-delivery-mock-ws -- --events=super_chat,subscription --mps=30
```

desktop 側の接続先を変える場合は、ルートの `.env` の `VITE_API_GATEWAY_WS_URL` をモックの `host` / `port` に合わせてください。

## 拡張ポイント

`comment-delivery` は 2 つの拡張ポイントで構成されています。

- Decorator: `CommentViewDto` 単位の装飾変換
- Sink: UI への出力先

### 1) Decorator を追加する

1. `CommentDecorator` を実装したクラスを作成  
   (`src/usecases/interfaces/comment-decorator.interface.ts`)
2. `decorate(comment)` で変換ルールを実装
3. `registerCommentDeliveryDependencies` で `DELIVERY_DI_TOKENS.commentDecorator` に追加登録

`DecorationPipeline` は `@injectAll` で登録順に適用します。

登録例:

```ts
targetContainer.register<CommentDecorator>(
  DELIVERY_DI_TOKENS.commentDecorator,
  { useClass: EmojiReplaceDecorator },
);
```

### 2) Sink を追加する

1. `CommentOutputPort` を実装したクラスを作成  
   (`src/usecases/interfaces/comment-output-port.interface.ts`)
2. `outputToUi(comments)` を実装（必要なら `close()` も実装）
3. `registerCommentDeliveryDependencies` で `DELIVERY_DI_TOKENS.commentOutputTarget` に追加登録

`MultiCommentOutputPort` がすべての target に fanout します。

登録例:

```ts
targetContainer.register<CommentOutputPort>(
  DELIVERY_DI_TOKENS.commentOutputTarget,
  { useClass: OverlayCommentOutputPort },
);
```

## 開発コマンド

```bash
pnpm --filter @comment-dock/comment-delivery test
pnpm --filter @comment-dock/comment-delivery check-types
```
