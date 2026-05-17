import { describe, expect, it, vi } from "vitest";
import {
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  type CommentViewDto,
} from "@comment-dock/shared";
import {
  COMMENT_STREAM_EVENT_TYPES,
  publishComment,
  publishComments,
  subscribeCommentStream,
} from "./comment-stream-events";

describe("comment-stream-events", () => {
  it("publishComment は subscribe した listener に単一コメントを配送する", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCommentStream(listener);
    const comment = createComment("comment-1");

    publishComment(comment);

    expect(listener).toHaveBeenCalledWith({
      type: COMMENT_STREAM_EVENT_TYPES.COMMENT_PUBLISHED,
      comment,
    });

    unsubscribe();
  });

  it("publishComments は subscribe した listener にコメント群を配送する", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCommentStream(listener);
    const comments = [createComment("comment-1"), createComment("comment-2")];

    publishComments(comments);

    expect(listener).toHaveBeenCalledWith({
      type: COMMENT_STREAM_EVENT_TYPES.COMMENTS_PUBLISHED,
      comments,
    });

    unsubscribe();
  });

  it("unsubscribe 後は listener を呼ばない", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCommentStream(listener);
    unsubscribe();

    publishComment(createComment("comment-1"));

    expect(listener).not.toHaveBeenCalled();
  });
});

const createComment = (id: string): CommentViewDto => ({
  id,
  source: COMMENT_SOURCES.YOUTUBE,
  author: { id: "user-1", name: "alice" },
  text: "hello",
  publishedAt: "2026-05-17T00:00:00.000Z",
  eventType: COMMENT_EVENT_TYPES.NORMAL,
});
