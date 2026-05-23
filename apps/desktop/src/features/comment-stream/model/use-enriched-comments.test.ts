import { describe, expect, it } from "vitest";
import {
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  type CommentViewDto,
} from "@comment-dock/shared";
import { getFilteredEnrichedComments } from "./use-enriched-comments";

describe("getFilteredEnrichedComments", () => {
  it("hideLowSignal=false のときリアクションも含める", () => {
    const comments = [createComment("comment-1", "www")];

    const enrichedComments = getFilteredEnrichedComments(comments, false);

    expect(enrichedComments).toHaveLength(1);
    expect(enrichedComments[0]?.isLowSignal).toBe(true);
  });

  it("hideLowSignal=true のときリアクションを除外する", () => {
    const comments = [
      createComment("comment-1", "www"),
      createComment("comment-2", "この曲歌える？"),
    ];

    const enrichedComments = getFilteredEnrichedComments(comments, true);

    expect(enrichedComments.map((comment) => comment.id)).toEqual([
      "comment-2",
    ]);
  });
});

const createComment = (id: string, text: string): CommentViewDto => ({
  id,
  source: COMMENT_SOURCES.YOUTUBE,
  author: { id: "user-1", name: "ねこまる" },
  text,
  publishedAt: "2026-05-17T00:00:00.000Z",
  eventType: COMMENT_EVENT_TYPES.NORMAL,
});
