import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import type { Comment } from "../../../entities/comment/comment.js";
import { CollectTwitchCommentsUseCase } from "./collect-comments.usecase.js";

const createComment = (id: string): Comment => ({
  id,
  source: "twitch",
  author: {
    id: `author-${id}`,
    name: `author-${id}`,
  },
  text: `comment-${id}`,
  publishedAt: new Date("2026-04-25T00:00:00Z"),
  eventType: "normal",
});

test("コメントを継続的に返す", async () => {
  const repository = {
    async *streamComments() {
      yield {
        comments: [createComment("1")],
        nextPageToken: undefined,
      };
    },
  };
  const useCase = new CollectTwitchCommentsUseCase(
    repository,
    1,
    async () => {},
  );

  const received: Comment[][] = [];
  for await (const comments of useCase.streamCommentsFromLiveChat({
    liveChatId: "chat-1",
  })) {
    received.push(comments);
    break;
  }

  assert.equal(received.length, 1);
  assert.equal(received[0]?.[0]?.id, "1");
});

test("切断後はpageToken無しで再接続する", async () => {
  const streamInputs: Array<{ liveChatId: string; pageToken?: string }> = [];
  const repository = {
    async *streamComments(input: { liveChatId: string; pageToken?: string }) {
      streamInputs.push(input);
      if (streamInputs.length === 1) {
        yield {
          comments: [createComment("1")],
          nextPageToken: "ignored-token",
        };
        throw new Error("stream disconnected");
      }

      yield {
        comments: [createComment("2")],
        nextPageToken: "ignored-token-2",
      };
    },
  };
  const waitCalls: number[] = [];
  const useCase = new CollectTwitchCommentsUseCase(
    repository,
    500,
    async (milliseconds) => {
      waitCalls.push(milliseconds);
    },
  );

  const receivedIds: string[] = [];
  for await (const comments of useCase.streamCommentsFromLiveChat({
    liveChatId: "chat-1",
  })) {
    receivedIds.push(...comments.map((comment) => comment.id));
    if (receivedIds.length >= 2) {
      break;
    }
  }

  assert.deepEqual(receivedIds, ["1", "2"]);
  assert.deepEqual(streamInputs, [
    { liveChatId: "chat-1" },
    { liveChatId: "chat-1" },
  ]);
  assert.deepEqual(waitCalls, [500]);
});
