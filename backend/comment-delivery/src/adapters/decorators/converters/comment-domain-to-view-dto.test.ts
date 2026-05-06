import test from "node:test";
import assert from "node:assert/strict";
import type { Comment } from "@comment-dock/comment-fetcher";
import { COMMENT_EVENT_TYPES, COMMENT_SOURCES } from "@comment-dock/shared";
import { convertCommentDomainToViewDto } from "./comment-domain-to-view-dto.js";

test("domain comment を CommentViewDto に変換できる", () => {
  const publishedAt = new Date("2026-05-06T08:00:00.000Z");
  const comment: Comment = {
    id: "comment-1",
    source: COMMENT_SOURCES.YOUTUBE,
    author: {
      id: "user-1",
      name: "alice",
    },
    text: "hello",
    publishedAt,
    eventType: COMMENT_EVENT_TYPES.NORMAL,
    monetaryAmount: {
      currency: "JPY",
      amount: 1000,
    },
  };

  const actual = convertCommentDomainToViewDto(comment);

  assert.deepEqual(actual, {
    id: "comment-1",
    source: COMMENT_SOURCES.YOUTUBE,
    author: {
      id: "user-1",
      name: "alice",
    },
    text: "hello",
    publishedAt: "2026-05-06T08:00:00.000Z",
    eventType: COMMENT_EVENT_TYPES.NORMAL,
    monetaryAmount: {
      currency: "JPY",
      amount: 1000,
    },
  });
});

test("monetaryAmount が無いコメントも変換できる", () => {
  const comment: Comment = {
    id: "comment-2",
    source: COMMENT_SOURCES.TWITCH,
    author: {
      id: "user-2",
      name: "bob",
    },
    text: "subscribed",
    publishedAt: new Date("2026-05-06T09:00:00.000Z"),
    eventType: COMMENT_EVENT_TYPES.SUBSCRIPTION,
  };

  const actual = convertCommentDomainToViewDto(comment);

  assert.equal(actual.monetaryAmount, undefined);
});
