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

## テスト用コメント注入

以前このパッケージに含まれていたモック WebSocket サーバー（`scripts/mock-comment-delivery-server.ts`）は廃止されました。代わりに `api-gateway` の HTTP エンドポイントへコメントを直接注入する方式に移行しています。

本番と同じ `DeliverCommentsUseCase` → `DecorationPipeline` → WebSocket の経路を通るため、Decorator の動作確認や負荷試験に使えます。

詳細は [backend/api-gateway/README.md](../api-gateway/README.md#テストコメント注入) を参照してください。

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
