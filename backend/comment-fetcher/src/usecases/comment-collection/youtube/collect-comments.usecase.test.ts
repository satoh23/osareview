import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import type { Comment } from "../../../entities/comment/comment.js";
import { CollectYouTubeCommentsUseCase } from "./collect-comments.usecase.js";

const createComment = (id: string): Comment => ({
  id,
  source: "youtube",
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
        nextPageToken: "next-1",
      };
    },
  };
  const useCase = new CollectYouTubeCommentsUseCase(
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

test("切断後は最後の nextPageToken を使って再接続する", async () => {
  const requestedPageTokens: Array<string | undefined> = [];
  const repository = {
    async *streamComments(input: { pageToken?: string }) {
      requestedPageTokens.push(input.pageToken);
      if (requestedPageTokens.length === 1) {
        yield {
          comments: [createComment("1")],
          nextPageToken: "resume-token",
        };
        throw new Error("stream disconnected");
      }

      yield {
        comments: [createComment("2")],
        nextPageToken: "resume-token-2",
      };
    },
  };
  const waitCalls: number[] = [];
  const useCase = new CollectYouTubeCommentsUseCase(
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
  assert.deepEqual(requestedPageTokens, [undefined, "resume-token"]);
  assert.deepEqual(waitCalls, [500]);
});
