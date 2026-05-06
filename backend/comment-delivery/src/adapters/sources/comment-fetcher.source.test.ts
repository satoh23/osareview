import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import type {
  Comment,
  CommentOutputPort as FetcherCommentOutputPort,
  RunCommentFetcherAppOptions,
} from "@comment-dock/comment-fetcher";
import { COMMENT_EVENT_TYPES, COMMENT_SOURCES } from "@comment-dock/shared";
import { CommentFetcherSource } from "./comment-fetcher.source.js";

type RunFetcher = (
  options: RunCommentFetcherAppOptions,
  outputPort: FetcherCommentOutputPort,
) => Promise<void>;

const buildComment = (id: string): Comment => ({
  id,
  source: COMMENT_SOURCES.YOUTUBE,
  author: { id: "u1", name: "alice" },
  text: `comment-${id}`,
  publishedAt: new Date("2026-05-06T10:00:00.000Z"),
  eventType: COMMENT_EVENT_TYPES.NORMAL,
});

test("CommentFetcherSource は fetcher output を receiveComments stream で受け取れる", async () => {
  const runFetcher: RunFetcher = async (
    _options: RunCommentFetcherAppOptions,
    outputPort: FetcherCommentOutputPort,
  ) => {
    await outputPort.outputComments([buildComment("c1")]);
    await outputPort.outputComments([buildComment("c2"), buildComment("c3")]);
  };

  const source = new CommentFetcherSource(runFetcher, {}, () => {});
  const received: Comment[][] = [];

  for await (const comments of source.receiveComments()) {
    received.push(comments);
  }

  assert.equal(received.length, 2);
  assert.deepEqual(
    received.map((batch) => batch.map((comment) => comment.id)),
    [["c1"], ["c2", "c3"]],
  );
});

test("CommentFetcherSource は fetcher エラーをそのまま呼び出し元へ伝播する", async () => {
  const expectedError = new Error("fetcher failed");
  const runFetcher: RunFetcher = async () => {
    throw expectedError;
  };
  const source = new CommentFetcherSource(runFetcher, {}, () => {});

  await assert.rejects(
    async () => {
      for await (const _comments of source.receiveComments()) {
        // no-op
      }
    },
    (error: unknown) => error === expectedError,
  );
});
