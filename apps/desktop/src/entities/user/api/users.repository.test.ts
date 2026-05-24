import { beforeEach, describe, expect, it, vi } from "vitest";
import { findUserByPlatformUserId } from "./users.repository";

const { db, firstRowMock } = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
  },
  firstRowMock: vi.fn<<T>(rows: T | T[]) => T | undefined>((rows) =>
    Array.isArray(rows) ? rows[0] : rows,
  ),
}));

vi.mock("../../../shared/api/sqlite", () => ({
  getDatabase: vi.fn(async () => db),
  firstRow: firstRowMock,
}));

const mockDbRow = {
  id: 1,
  platform: "youtube",
  platform_user_id: "UC_test_user",
  display_name: "Test User",
  first_seen_at: "2026-01-01T00:00:00.000Z",
  last_seen_at: "2026-05-01T00:00:00.000Z",
  visit_count: 5,
  observed_comment_count: 20,
  support_count: 2,
  last_support_at: "2026-04-01T00:00:00.000Z",
};

describe("findUserByPlatformUserId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ユーザーが存在するとき camelCase に変換した UserRow を返す", async () => {
    db.select.mockResolvedValueOnce([mockDbRow]);

    const result = await findUserByPlatformUserId({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(result).toEqual({
      id: 1,
      platform: "youtube",
      platformUserId: "UC_test_user",
      displayName: "Test User",
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: "2026-05-01T00:00:00.000Z",
      visitCount: 5,
      observedCommentCount: 20,
      supportCount: 2,
      lastSupportAt: "2026-04-01T00:00:00.000Z",
    });
  });

  it("platform と platform_user_id を SQL パラメータとして渡す", async () => {
    db.select.mockResolvedValueOnce([mockDbRow]);

    await findUserByPlatformUserId({
      platform: "twitch",
      platformUserId: "twitch_user_123",
    });

    expect(db.select).toHaveBeenCalledTimes(1);
    const [sql, params] = db.select.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("WHERE platform = $1 AND platform_user_id = $2");
    expect(params).toEqual(["twitch", "twitch_user_123"]);
  });

  it("ユーザーが存在しないとき null を返す", async () => {
    db.select.mockResolvedValueOnce([]);
    firstRowMock.mockReturnValueOnce(undefined);

    const result = await findUserByPlatformUserId({
      platform: "youtube",
      platformUserId: "non_existent_user",
    });

    expect(result).toBeNull();
  });

  it("last_support_at が null のときも正しくマッピングする", async () => {
    db.select.mockResolvedValueOnce([
      { ...mockDbRow, support_count: 0, last_support_at: null },
    ]);

    const result = await findUserByPlatformUserId({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(result?.supportCount).toBe(0);
    expect(result?.lastSupportAt).toBeNull();
  });
});
