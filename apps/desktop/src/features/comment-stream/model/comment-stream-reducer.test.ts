import { describe, expect, it } from "vitest";
import {
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  type CommentViewDto,
} from "@comment-dock/shared";
import {
  COMMENT_STREAM_ACTION_TYPES,
  commentStreamReducer,
  createInitialCommentStreamStore,
} from "./comment-stream-reducer";

describe("commentStreamReducer", () => {
  it("初期状態はコメントなしで bufferSize を保持する", () => {
    const state = createInitialCommentStreamStore(500);

    expect(state).toEqual({
      comments: [],
      bufferSize: 500,
    });
  });

  it("COMMENT_APPENDED でコメントを末尾に追加する", () => {
    const comment = createComment("comment-1");

    const state = commentStreamReducer(createInitialCommentStreamStore(500), {
      type: COMMENT_STREAM_ACTION_TYPES.COMMENT_APPENDED,
      comment,
    });

    expect(state.comments).toEqual([comment]);
  });

  it("bufferSize 超過時は古いコメントから切り捨てる", () => {
    const state = commentStreamReducer(createInitialCommentStreamStore(2), {
      type: COMMENT_STREAM_ACTION_TYPES.COMMENTS_BATCH_APPENDED,
      comments: [
        createComment("comment-1"),
        createComment("comment-2"),
        createComment("comment-3"),
      ],
    });

    expect(state.comments.map((comment) => comment.id)).toEqual([
      "comment-2",
      "comment-3",
    ]);
  });

  it("既存 id の二重 append は無視する", () => {
    const first = createComment("comment-1", "first");
    const duplicate = createComment("comment-1", "duplicate");
    const appended = commentStreamReducer(
      createInitialCommentStreamStore(500),
      {
        type: COMMENT_STREAM_ACTION_TYPES.COMMENT_APPENDED,
        comment: first,
      },
    );

    const state = commentStreamReducer(appended, {
      type: COMMENT_STREAM_ACTION_TYPES.COMMENT_APPENDED,
      comment: duplicate,
    });

    expect(state.comments).toEqual([first]);
  });

  it("COMMENTS_BATCH_APPENDED でコメント群をまとめて追加し、batch 内の重複 id も無視する", () => {
    const first = createComment("comment-1", "first");
    const duplicate = createComment("comment-1", "duplicate");
    const second = createComment("comment-2", "second");

    const state = commentStreamReducer(createInitialCommentStreamStore(500), {
      type: COMMENT_STREAM_ACTION_TYPES.COMMENTS_BATCH_APPENDED,
      comments: [first, duplicate, second],
    });

    expect(state.comments).toEqual([first, second]);
  });

  it("CLEARED でコメントを空にする", () => {
    const appended = commentStreamReducer(
      createInitialCommentStreamStore(500),
      {
        type: COMMENT_STREAM_ACTION_TYPES.COMMENT_APPENDED,
        comment: createComment("comment-1"),
      },
    );

    const state = commentStreamReducer(appended, {
      type: COMMENT_STREAM_ACTION_TYPES.CLEARED,
    });

    expect(state.comments).toEqual([]);
    expect(state.bufferSize).toBe(500);
  });
});

const createComment = (id: string, text = "hello"): CommentViewDto => ({
  id,
  source: COMMENT_SOURCES.YOUTUBE,
  author: { id: "user-1", name: "alice" },
  text,
  publishedAt: "2026-05-17T00:00:00.000Z",
  eventType: COMMENT_EVENT_TYPES.NORMAL,
});
