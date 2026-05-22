import { describe, expect, it } from "vitest";
import { countIncomingComments } from "./use-new-comment-badge";

describe("countIncomingComments", () => {
  it("既知 id に存在しないコメントだけを新着として数える", () => {
    const knownCommentIds = new Set(["comment-1", "comment-2"]);

    const count = countIncomingComments(knownCommentIds, [
      { id: "comment-1" },
      { id: "comment-3" },
      { id: "comment-4" },
    ]);

    expect(count).toBe(2);
  });

  it("すべて既知 id なら 0 を返す", () => {
    const knownCommentIds = new Set(["comment-1", "comment-2"]);

    const count = countIncomingComments(knownCommentIds, [
      { id: "comment-1" },
      { id: "comment-2" },
    ]);

    expect(count).toBe(0);
  });
});
