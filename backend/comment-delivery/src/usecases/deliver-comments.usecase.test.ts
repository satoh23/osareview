import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { COMMENT_EVENT_TYPES, COMMENT_SOURCES } from "@comment-dock/shared";
import type { Comment } from "@comment-dock/comment-fetcher";
import { DecorationPipeline } from "../adapters/decorators/decoration-pipeline.js";
import type { CommentDecorator } from "./interfaces/comment-decorator.interface.js";
import type { CommentOutputPort } from "./interfaces/comment-output-port.interface.js";
import { DeliverCommentsUseCase } from "./deliver-comments.usecase.js";

const buildComment = (id: string, text: string): Comment => ({
  id,
  source: COMMENT_SOURCES.YOUTUBE,
  author: { id: "u1", name: "alice" },
  text,
  publishedAt: new Date("2026-05-06T10:00:00.000Z"),
  eventType: COMMENT_EVENT_TYPES.NORMAL,
});

test("DeliverCommentsUseCase は変換と装飾後に UI へ出力する", async () => {
  const outputCalls: string[] = [];
  const outputPort: CommentOutputPort = {
    async outputToUi(comments) {
      outputCalls.push(...comments.map((comment) => comment.text));
    },
  };

  const decorators: CommentDecorator[] = [
    {
      decorate(comment) {
        return { ...comment, text: `${comment.text}-decorated` };
      },
    },
  ];
  const decorationPipeline = new DecorationPipeline(decorators);

  const useCase = new DeliverCommentsUseCase(outputPort, decorationPipeline);
  await useCase.deliverComments([buildComment("c1", "hello")]);

  assert.deepEqual(outputCalls, ["hello-decorated"]);
});
