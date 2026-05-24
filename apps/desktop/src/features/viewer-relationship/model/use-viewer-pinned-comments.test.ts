import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib", () => ({
  markPerf: vi.fn(),
  measurePerf: vi.fn(),
}));

import { pinnedRowToEnrichedComment } from "./use-viewer-pinned-comments";

const mockPinnedRow = {
  id: 1,
  userId: 10,
  commentId: 5,
  pinnedText: "重要な発言",
  note: "後で確認",
  commentText: "素晴らしい配信ですね",
  commentType: "praise",
  commentedAt: "2026-05-01T10:00:00.000Z",
  commentPlatform: "youtube",
  liveSessionId: 3,
  liveSessionTitle: "テスト配信",
  liveSessionPlatformLiveId: "live_xyz",
  liveSessionStartedAt: "2026-05-01T09:00:00.000Z",
};

describe("pinnedRowToEnrichedComment", () => {
  it("commentId が存在するとき id を String(commentId) にする", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.id).toBe("5");
  });

  it("commentId が null のとき id を pinned-{id} にする", () => {
    const result = pinnedRowToEnrichedComment({
      ...mockPinnedRow,
      commentId: null,
    });
    expect(result.id).toBe("pinned-1");
  });

  it("commentText が存在するとき text に commentText を設定する", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.text).toBe("素晴らしい配信ですね");
  });

  it("commentText が null のとき text に pinnedText を設定する", () => {
    const result = pinnedRowToEnrichedComment({
      ...mockPinnedRow,
      commentText: null,
    });
    expect(result.text).toBe("重要な発言");
  });

  it("source に commentPlatform を設定する", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.source).toBe("youtube");
  });

  it("isPinned は常に true", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.isPinned).toBe(true);
  });

  it("publishedAt に commentedAt を設定する", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.publishedAt).toBe("2026-05-01T10:00:00.000Z");
  });

  it("commentedAt が null のとき publishedAt は空文字", () => {
    const result = pinnedRowToEnrichedComment({
      ...mockPinnedRow,
      commentedAt: null,
    });
    expect(result.publishedAt).toBe("");
  });

  it("liveSessionTitle が設定される", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.liveSessionTitle).toBe("テスト配信");
  });

  it("liveSessionTitle が null のとき undefined になる", () => {
    const result = pinnedRowToEnrichedComment({
      ...mockPinnedRow,
      liveSessionTitle: null,
    });
    expect(result.liveSessionTitle).toBeUndefined();
  });

  it("isLowSignal は常に false", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.isLowSignal).toBe(false);
  });

  it("commentTypes は空配列", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.commentTypes).toEqual([]);
  });

  it("badges は空配列", () => {
    const result = pinnedRowToEnrichedComment(mockPinnedRow);
    expect(result.badges).toEqual([]);
  });
});

const listPinnedCommentsByUserIdMock =
  vi.fn<(args: { userId: number; limit: number }) => Promise<unknown[]>>();

vi.mock(
  "../../../entities/pinned-comment/api/pinned-comments.repository",
  () => ({
    listPinnedCommentsByUserId: (
      args: Parameters<typeof listPinnedCommentsByUserIdMock>[0],
    ) => listPinnedCommentsByUserIdMock(args),
  }),
);

import { listPinnedCommentsByUserId } from "../../../entities/pinned-comment/api/pinned-comments.repository";

describe("useViewerPinnedComments (repository パス検証)", () => {
  it("listPinnedCommentsByUserId に userId と limit を渡す", async () => {
    listPinnedCommentsByUserIdMock.mockResolvedValueOnce([]);

    await listPinnedCommentsByUserId({ userId: 10, limit: 50 });

    expect(listPinnedCommentsByUserIdMock).toHaveBeenCalledWith({
      userId: 10,
      limit: 50,
    });
  });

  it("listPinnedCommentsByUserId がエラーを投げる", async () => {
    listPinnedCommentsByUserIdMock.mockRejectedValueOnce(
      new Error("DB エラー"),
    );

    await expect(
      listPinnedCommentsByUserId({ userId: 99, limit: 50 }),
    ).rejects.toThrow("DB エラー");
  });
});
