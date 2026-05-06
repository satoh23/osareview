import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { COMMENT_EVENT_TYPES, COMMENT_SOURCES } from "@comment-dock/shared";
import type { CommentOutputPort } from "../../usecases/interfaces/comment-output-port.interface.js";
import { MultiCommentOutputPort } from "./multi-comment.output-port.js";

const sampleComments = [
  {
    id: "c1",
    source: COMMENT_SOURCES.YOUTUBE,
    author: { id: "u1", name: "alice" },
    text: "hello",
    publishedAt: "2026-05-06T09:00:00.000Z",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
  },
];

test("1つの出力先が失敗しても他の出力先は処理継続する", async () => {
  const calls: string[] = [];
  const successPort: CommentOutputPort = {
    async outputToUi() {
      calls.push("success");
    },
  };
  const failingPort: CommentOutputPort = {
    async outputToUi() {
      calls.push("failing");
      throw new Error("failed");
    },
  };
  const multi = new MultiCommentOutputPort([successPort, failingPort]);

  await multi.outputToUi(sampleComments);

  assert.deepEqual(calls.sort(), ["failing", "success"]);
});
