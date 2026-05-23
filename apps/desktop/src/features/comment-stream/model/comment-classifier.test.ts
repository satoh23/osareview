import { describe, expect, it } from "vitest";
import {
  COMMENT_EVENT_TYPES,
  COMMENT_SOURCES,
  type CommentViewDto,
} from "@comment-dock/shared";
import { enrichComment } from "./comment-classifier";

describe("enrichComment", () => {
  it("質問や久しぶりコメントを重要コメントとして分類する", () => {
    const comment = createComment(
      "comment-1",
      "1ヶ月ぶり！この前おすすめしてたゲーム買ったよ？",
    );

    const enriched = enrichComment(comment);

    expect(enriched.commentTypes).toEqual(
      expect.arrayContaining(["question", "long_time_no_see"]),
    );
    expect(enriched.viewerStatus).toBe("long_time_no_see");
    expect(enriched.isImportant).toBe(true);
    expect(enriched.isLowSignal).toBe(false);
  });

  it("短いリアクションをリアクションとして分類する", () => {
    const enriched = enrichComment(createComment("comment-2", "www"));

    expect(enriched.commentTypes).toContain("low_signal");
    expect(enriched.isLowSignal).toBe(true);
    expect(enriched.isImportant).toBe(true);
    expect(enriched.isPinned).toBe(true);
  });

  it("支援イベントを support として分類する", () => {
    const enriched = enrichComment({
      ...createComment("comment-3", "初Super Chatです！ありがとう"),
      eventType: COMMENT_EVENT_TYPES.SUPER_CHAT,
      monetaryAmount: { currency: "JPY", amount: 500 },
    });

    expect(enriched.commentTypes).toEqual(
      expect.arrayContaining(["support", "thanks"]),
    );
    expect(enriched.viewerStatus).toBe("supporter");
    expect(enriched.support).toEqual({
      type: "super_chat",
      amountLabel: "JPY 500",
      isFirstSupport: true,
    });
    expect(enriched.isPinned).toBe(true);
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
