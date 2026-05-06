import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { COMMENT_EVENT_TYPES, COMMENT_SOURCES } from "@comment-dock/shared";
import type { CommentDecorator } from "../../usecases/interfaces/comment-decorator.interface.js";
import { DecorationPipeline } from "./decoration-pipeline.js";

test("DecorationPipeline はデコレーターを登録順で適用する", async () => {
  const decorators: CommentDecorator[] = [
    {
      decorate(comment) {
        return { ...comment, text: `${comment.text}-d1` };
      },
    },
    {
      async decorate(comment) {
        return { ...comment, text: `${comment.text}-d2` };
      },
    },
  ];
  const pipeline = new DecorationPipeline(decorators);
  const comments = [
    {
      id: "c1",
      source: COMMENT_SOURCES.YOUTUBE,
      author: { id: "u1", name: "alice" },
      text: "hello",
      publishedAt: "2026-05-06T08:00:00.000Z",
      eventType: COMMENT_EVENT_TYPES.NORMAL,
    },
  ];

  const actual = await pipeline.decorateComments(comments);
  assert.equal(actual[0]?.text, "hello-d1-d2");
});

test("DecorationPipeline はデコレーターが空なら入力をそのまま返す", async () => {
  const pipeline = new DecorationPipeline([]);
  const comments = [
    {
      id: "c2",
      source: COMMENT_SOURCES.TWITCH,
      author: { id: "u2", name: "bob" },
      text: "yo",
      publishedAt: "2026-05-06T09:00:00.000Z",
      eventType: COMMENT_EVENT_TYPES.SUBSCRIPTION,
    },
  ];

  const actual = await pipeline.decorateComments(comments);
  assert.deepEqual(actual, comments);
});
