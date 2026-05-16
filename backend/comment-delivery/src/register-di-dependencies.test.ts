import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { container } from "tsyringe";
import { COMMENT_EVENT_TYPES, COMMENT_SOURCES } from "@comment-dock/shared";
import { DELIVERY_DI_TOKENS } from "./infrastructure/shared/di-tokens.js";
import type { CommentDecorator } from "./usecases/interfaces/comment-decorator.interface.js";
import { ConsoleCommentOutputPort } from "./adapters/output-ports/console-comment.output-port.js";
import { MultiCommentOutputPort } from "./adapters/output-ports/multi-comment.output-port.js";
import { WebSocketCommentOutputPort } from "./adapters/output-ports/websocket-comment.output-port.js";
import { registerCommentDeliveryDependencies } from "./register-di-dependencies.js";
import { DeliverCommentsUseCase } from "./usecases/deliver-comments.usecase.js";

test("register + resolveAll で複数デコレーターを登録順に解決できる", async () => {
  const c = container.createChildContainer();
  registerCommentDeliveryDependencies(c);
  c.register<CommentDecorator>(DELIVERY_DI_TOKENS.commentDecorator, {
    useValue: {
      decorate(comment) {
        return { ...comment, text: `${comment.text}-extra` };
      },
    },
  });

  const resolved = c.resolveAll<CommentDecorator>(
    DELIVERY_DI_TOKENS.commentDecorator,
  );
  const input = {
    id: "c1",
    source: COMMENT_SOURCES.YOUTUBE,
    author: { id: "u1", name: "alice" },
    text: "hello",
    publishedAt: "2026-05-06T08:00:00.000Z",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
  };

  const first = await resolved[0]?.decorate(input);
  const second = await resolved[1]?.decorate(input);

  assert.ok(resolved.length >= 2);
  assert.deepEqual(first, input);
  assert.equal(second?.text, "hello-extra");
});

test("出力ポートを DI で構成できる", () => {
  const c = container.createChildContainer();
  registerCommentDeliveryDependencies(c);

  const outputPort = c.resolve(DELIVERY_DI_TOKENS.commentOutputPort);
  const targets = c.resolveAll(DELIVERY_DI_TOKENS.commentOutputTarget);

  assert.ok(outputPort instanceof MultiCommentOutputPort);
  assert.equal(targets.length, 2);
  assert.ok(
    targets.some((target) => target instanceof ConsoleCommentOutputPort),
  );
  assert.ok(
    targets.some((target) => target instanceof WebSocketCommentOutputPort),
  );
});

test("DeliverCommentsUseCase を DI で解決できる", () => {
  const c = container.createChildContainer();
  registerCommentDeliveryDependencies(c);

  const useCase = c.resolve(DeliverCommentsUseCase);

  assert.ok(useCase instanceof DeliverCommentsUseCase);
});
