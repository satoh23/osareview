import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertComment } from "./comments.repository";

const { db, firstRowMock } = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
  },
  firstRowMock: vi.fn<<T>(rows: T | T[]) => T | undefined>((rows) =>
    Array.isArray(rows) ? rows[0] : rows,
  ),
}));

vi.mock("../../../shared/api/sqlite", () => ({
  getDatabase: vi.fn(async () => db),
  firstRow: firstRowMock,
}));

describe("insertComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("INSERT 成功時に inserted=true を返す", async () => {
    db.select.mockResolvedValueOnce([{ id: 42 }]);

    const result = await insertComment({
      liveSessionId: 1,
      userId: 10,
      platform: "youtube",
      platformCommentId: "yt-1",
      commentText: "hello",
      commentType: "normal",
      isLowSignal: false,
      commentedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result).toEqual({ inserted: true, id: 42 });
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("UNIQUE 制約違反時に duplicate_platform_comment を返す", async () => {
    db.select.mockRejectedValueOnce(
      new Error(
        "UNIQUE constraint failed: comments.platform, comments.platform_comment_id",
      ),
    );

    const result = await insertComment({
      liveSessionId: 1,
      userId: 10,
      platform: "youtube",
      platformCommentId: "yt-dup",
      commentText: "hello",
      commentType: "normal",
      isLowSignal: false,
      commentedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result).toEqual({
      inserted: false,
      reason: "duplicate_platform_comment",
    });
  });
});
