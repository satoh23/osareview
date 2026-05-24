import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib", () => ({
  markPerf: vi.fn(),
  measurePerf: vi.fn(),
}));

vi.mock("../../../entities/comment", () => ({
  isLowSignalText: vi.fn(() => false),
}));

import { commentRowToEnrichedComment } from "./use-viewer-comments";

const mockCommentRow = {
  id: 10,
  liveSessionId: 1,
  platform: "youtube",
  platformCommentId: "yt-abc",
  commentText: "こんにちは",
  commentType: "normal",
  isLowSignal: false,
  commentedAt: "2026-05-01T10:00:00.000Z",
  liveSessionTitle: "テスト配信",
  liveSessionPlatformLiveId: "live_xyz",
  liveSessionStartedAt: "2026-05-01T09:00:00.000Z",
};

describe("commentRowToEnrichedComment", () => {
  it("id を文字列に変換する", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.id).toBe("10");
  });

  it("source に platform を設定する", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.source).toBe("youtube");
  });

  it("text に commentText を設定する", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.text).toBe("こんにちは");
  });

  it("publishedAt に commentedAt を設定する", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.publishedAt).toBe("2026-05-01T10:00:00.000Z");
  });

  it("isPinned は常に false", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.isPinned).toBe(false);
  });

  it("liveSessionTitle が設定される", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.liveSessionTitle).toBe("テスト配信");
  });

  it("liveSessionTitle が null のとき undefined になる", () => {
    const result = commentRowToEnrichedComment({
      ...mockCommentRow,
      liveSessionTitle: null,
    });
    expect(result.liveSessionTitle).toBeUndefined();
  });

  it("isLowSignal=true のとき isLowSignal=true になる", () => {
    const result = commentRowToEnrichedComment({
      ...mockCommentRow,
      isLowSignal: true,
    });
    expect(result.isLowSignal).toBe(true);
  });

  it("commentTypes は空配列", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.commentTypes).toEqual([]);
  });

  it("badges は空配列", () => {
    const result = commentRowToEnrichedComment(mockCommentRow);
    expect(result.badges).toEqual([]);
  });
});

const listCommentsByUserIdMock =
  vi.fn<(args: { userId: number; limit: number }) => Promise<unknown[]>>();

vi.mock("../../../entities/comment/api/comments.repository", () => ({
  listCommentsByUserId: (
    args: Parameters<typeof listCommentsByUserIdMock>[0],
  ) => listCommentsByUserIdMock(args),
}));

import { listCommentsByUserId } from "../../../entities/comment/api/comments.repository";

describe("useViewerComments (repository パス検証)", () => {
  it("listCommentsByUserId に userId と limit を渡す", async () => {
    listCommentsByUserIdMock.mockResolvedValueOnce([]);

    await listCommentsByUserId({ userId: 42, limit: 200 });

    expect(listCommentsByUserIdMock).toHaveBeenCalledWith({
      userId: 42,
      limit: 200,
    });
  });

  it("listCommentsByUserId がエラーを投げる", async () => {
    listCommentsByUserIdMock.mockRejectedValueOnce(new Error("DB エラー"));

    await expect(
      listCommentsByUserId({ userId: 99, limit: 200 }),
    ).rejects.toThrow("DB エラー");
  });
});
