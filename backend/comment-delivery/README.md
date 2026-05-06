# comment-delivery

`comment-fetcher` が取得したコメントを受け取り、装飾パイプラインを通して UI 向けに配信するサービスです。

現在の既定構成は次のとおりです。

- Source: `CommentFetcherSource`
- Decorator: `IdentityDecorator`（no-op）
- Sink: `MultiCommentOutputPort`（`ConsoleCommentOutputPort` + `WebSocketCommentOutputPort` に fanout）

## 起動手順

リポジトリルートで実行します。

```bash
pnpm dev:comment-delivery
```

`backend/comment-delivery` 直下で実行する場合:

```bash
pnpm dev
```

## 環境変数

`.env.example` を参考に `.env` を作成してください。

```env
# comment-fetcher 側の設定（最低限）
TWITCH_CLIENT_ID=
TWITCH_TARGET_CHANNEL_ID=

# comment-delivery WebSocket
COMMENT_DELIVERY_WS_HOST=127.0.0.1
COMMENT_DELIVERY_WS_PORT=17331
```

- `COMMENT_DELIVERY_WS_HOST` 既定値: `127.0.0.1`
- `COMMENT_DELIVERY_WS_PORT` 既定値: `17331`

## 拡張ポイント

`comment-delivery` は 3 つの拡張ポイントで構成されています。

- Source: コメント入力元（`Comment[]` のストリーム）
- Decorator: `CommentViewDto` 単位の装飾変換
- Sink: UI への出力先

### 1) Source を追加する

1. `CommentSource` を実装したクラスを作成  
   (`src/usecases/interfaces/comment-source.interface.ts`)
2. `receiveComments(): AsyncIterable<Comment[]>` を実装
3. `registerCommentDeliveryDependencies` で `DELIVERY_DI_TOKENS.commentSource` に登録

登録例:

```ts
targetContainer.register<CommentSource>(DELIVERY_DI_TOKENS.commentSource, {
  useClass: ReplayCommentSource,
});
```

### 2) Decorator を追加する

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

### 3) Sink を追加する

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
