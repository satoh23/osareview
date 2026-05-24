import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  insertPinnedComment,
  listPinnedCommentsByUserId,
} from "./pinned-comments.repository";

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

describe("insertPinnedComment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("INSERT 成功時に inserted=true を返す", async () => {
    db.select.mockResolvedValueOnce([{ id: 1 }]);

    const result = await insertPinnedComment({
      userId: 10,
      commentId: 5,
      pinnedText: "ピン留めテキスト",
      note: "メモ",
    });

    expect(result).toEqual({ inserted: true, id: 1 });
  });

  it("ON CONFLICT DO NOTHING で行が返らないとき duplicate_comment_pin を返す", async () => {
    db.select.mockResolvedValueOnce([]);
    firstRowMock.mockReturnValueOnce(undefined);

    const result = await insertPinnedComment({
      userId: 10,
      commentId: 5,
      pinnedText: "ピン留めテキスト",
    });

    expect(result).toEqual({
      inserted: false,
      reason: "duplicate_comment_pin",
    });
  });
});

const mockDbPinnedRow = {
  id: 1,
  user_id: 10,
  comment_id: 5,
  pinned_text: "重要な発言",
  note: "後で確認",
  comment_text: "素晴らしい配信ですね",
  comment_type: "praise",
  commented_at: "2026-05-01T10:00:00.000Z",
  comment_platform: "youtube",
  live_session_id: 3,
  live_session_title: "テスト配信",
  live_session_platform_live_id: "live_xyz",
  live_session_started_at: "2026-05-01T09:00:00.000Z",
};

describe("listPinnedCommentsByUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ピン留めコメント行を camelCase の PinnedCommentRow[] にマッピングして返す", async () => {
    db.select.mockResolvedValueOnce([mockDbPinnedRow]);

    const result = await listPinnedCommentsByUserId({ userId: 10, limit: 50 });

    expect(result).toEqual([
      {
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
      },
    ]);
  });

  it("userId と limit を SQL パラメータとして渡す", async () => {
    db.select.mockResolvedValueOnce([mockDbPinnedRow]);

    await listPinnedCommentsByUserId({ userId: 10, limit: 50 });

    expect(db.select).toHaveBeenCalledTimes(1);
    const [sql, params] = db.select.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("WHERE pc.user_id = $1");
    expect(sql).toContain("LIMIT $2");
    expect(params).toEqual([10, 50]);
  });

  it("LEFT JOIN comments と LEFT JOIN live_sessions の SQL を含む", async () => {
    db.select.mockResolvedValueOnce([]);

    await listPinnedCommentsByUserId({ userId: 10, limit: 50 });

    const [sql] = db.select.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("LEFT JOIN comments c ON c.id = pc.comment_id");
    expect(sql).toContain(
      "LEFT JOIN live_sessions ls ON ls.id = c.live_session_id",
    );
    expect(sql).toContain("ORDER BY pc.id DESC");
  });

  it("comment_id が null のとき元コメント関連フィールドはすべて null", async () => {
    db.select.mockResolvedValueOnce([
      {
        ...mockDbPinnedRow,
        comment_id: null,
        comment_text: null,
        comment_type: null,
        commented_at: null,
        comment_platform: null,
        live_session_id: null,
        live_session_title: null,
        live_session_platform_live_id: null,
        live_session_started_at: null,
      },
    ]);

    const result = await listPinnedCommentsByUserId({ userId: 10, limit: 50 });

    expect(result[0].commentId).toBeNull();
    expect(result[0].commentText).toBeNull();
    expect(result[0].commentType).toBeNull();
    expect(result[0].commentedAt).toBeNull();
    expect(result[0].commentPlatform).toBeNull();
    expect(result[0].liveSessionId).toBeNull();
    expect(result[0].liveSessionTitle).toBeNull();
    expect(result[0].liveSessionPlatformLiveId).toBeNull();
    expect(result[0].liveSessionStartedAt).toBeNull();
  });

  it("live_session_title が null のとき liveSessionTitle は null のまま返す", async () => {
    db.select.mockResolvedValueOnce([
      { ...mockDbPinnedRow, live_session_title: null },
    ]);

    const result = await listPinnedCommentsByUserId({ userId: 10, limit: 50 });

    expect(result[0].liveSessionTitle).toBeNull();
  });

  it("0 件のとき空配列を返す", async () => {
    db.select.mockResolvedValueOnce([]);

    const result = await listPinnedCommentsByUserId({ userId: 99, limit: 50 });

    expect(result).toEqual([]);
  });

  it("note が null のときも正しくマッピングする", async () => {
    db.select.mockResolvedValueOnce([{ ...mockDbPinnedRow, note: null }]);

    const result = await listPinnedCommentsByUserId({ userId: 10, limit: 50 });

    expect(result[0].note).toBeNull();
  });
});
