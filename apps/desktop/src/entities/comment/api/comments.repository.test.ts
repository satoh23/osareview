import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertComment, listCommentsByUserId } from "./comments.repository";

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

const mockDbCommentRow = {
  id: 10,
  live_session_id: 1,
  platform: "youtube",
  platform_comment_id: "yt-abc",
  comment_text: "こんにちは",
  comment_type: "normal",
  is_low_signal: 0,
  commented_at: "2026-05-01T10:00:00.000Z",
  live_session_title: "テスト配信",
  live_session_platform_live_id: "live_xyz",
  live_session_started_at: "2026-05-01T09:00:00.000Z",
};

describe("listCommentsByUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("コメント行を camelCase の CommentHistoryRow[] にマッピングして返す", async () => {
    db.select.mockResolvedValueOnce([mockDbCommentRow]);

    const result = await listCommentsByUserId({ userId: 5, limit: 200 });

    expect(result).toEqual([
      {
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
      },
    ]);
  });

  it("userId と limit を SQL パラメータとして渡す", async () => {
    db.select.mockResolvedValueOnce([mockDbCommentRow]);

    await listCommentsByUserId({ userId: 42, limit: 50 });

    expect(db.select).toHaveBeenCalledTimes(1);
    const [sql, params] = db.select.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("WHERE c.user_id = $1");
    expect(sql).toContain("LIMIT $2");
    expect(params).toEqual([42, 50]);
  });

  it("INNER JOIN live_sessions の SQL を含む", async () => {
    db.select.mockResolvedValueOnce([]);

    await listCommentsByUserId({ userId: 1, limit: 200 });

    const [sql] = db.select.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain(
      "INNER JOIN live_sessions ls ON ls.id = c.live_session_id",
    );
    expect(sql).toContain("ORDER BY c.commented_at DESC");
  });

  it("is_low_signal=1 のとき isLowSignal=true に変換する", async () => {
    db.select.mockResolvedValueOnce([
      { ...mockDbCommentRow, is_low_signal: 1 },
    ]);

    const result = await listCommentsByUserId({ userId: 5, limit: 200 });

    expect(result[0].isLowSignal).toBe(true);
  });

  it("live_session_title が null のとき liveSessionTitle は null のまま返す", async () => {
    db.select.mockResolvedValueOnce([
      {
        ...mockDbCommentRow,
        live_session_title: null,
        live_session_platform_live_id: null,
        live_session_started_at: null,
      },
    ]);

    const result = await listCommentsByUserId({ userId: 5, limit: 200 });

    expect(result[0].liveSessionTitle).toBeNull();
    expect(result[0].liveSessionPlatformLiveId).toBeNull();
    expect(result[0].liveSessionStartedAt).toBeNull();
  });

  it("0 件のとき空配列を返す", async () => {
    db.select.mockResolvedValueOnce([]);

    const result = await listCommentsByUserId({ userId: 99, limit: 200 });

    expect(result).toEqual([]);
  });
});
