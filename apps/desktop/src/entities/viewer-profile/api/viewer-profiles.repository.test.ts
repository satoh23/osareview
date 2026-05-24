import { beforeEach, describe, expect, it, vi } from "vitest";
import { getViewerProfile } from "./viewer-profiles.repository";
import type { UserRow } from "../../user/model/types";
import type { CommentHistoryRow } from "../../comment/api/comments.repository";
import type { PinnedCommentRow } from "../../pinned-comment/model/types";

vi.mock("../../user/api/users.repository", () => ({
  findUserByPlatformUserId: vi.fn(),
}));

vi.mock("../../comment/api/comments.repository", () => ({
  listCommentsByUserId: vi.fn(),
}));

vi.mock("../../pinned-comment/api/pinned-comments.repository", () => ({
  listPinnedCommentsByUserId: vi.fn(),
}));

import { findUserByPlatformUserId } from "../../user/api/users.repository";
import { listCommentsByUserId } from "../../comment/api/comments.repository";
import { listPinnedCommentsByUserId } from "../../pinned-comment/api/pinned-comments.repository";

const mockUser: UserRow = {
  id: 1,
  platform: "youtube",
  platformUserId: "UC_test_user",
  displayName: "テストユーザー",
  firstSeenAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: "2026-05-20T00:00:00.000Z",
  visitCount: 10,
  observedCommentCount: 50,
  supportCount: 2,
  lastSupportAt: "2026-04-01T00:00:00.000Z",
};

const mockCommentRow: CommentHistoryRow = {
  id: 100,
  liveSessionId: 5,
  platform: "youtube",
  platformCommentId: "yt-100",
  commentText: "こんにちは！",
  commentType: "normal",
  isLowSignal: false,
  commentedAt: "2026-05-20T22:10:00.000Z",
  liveSessionTitle: "テスト配信タイトル",
  liveSessionPlatformLiveId: "live_abc",
  liveSessionStartedAt: "2026-05-20T21:00:00.000Z",
};

const mockPinnedRow: PinnedCommentRow = {
  id: 1,
  userId: 1,
  commentId: 100,
  pinnedText: "こんにちは！",
  note: "重要なコメント",
  commentText: "こんにちは！",
  commentType: "normal",
  commentedAt: "2026-05-20T22:10:00.000Z",
  commentPlatform: "youtube",
  liveSessionId: 5,
  liveSessionTitle: "テスト配信タイトル",
  liveSessionPlatformLiveId: "live_abc",
  liveSessionStartedAt: "2026-05-20T21:00:00.000Z",
};

describe("viewerProfilesRepository.getViewerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findUserByPlatformUserId).mockResolvedValue(mockUser);
    vi.mocked(listCommentsByUserId).mockResolvedValue([mockCommentRow]);
    vi.mocked(listPinnedCommentsByUserId).mockResolvedValue([mockPinnedRow]);
  });

  it("DB にユーザーが存在するとき ViewerProfile を組み立てて返す", async () => {
    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile).not.toBeNull();
    expect(profile?.userId).toBe("youtube:UC_test_user");
    expect(profile?.platform).toBe("youtube");
    expect(profile?.displayName).toBe("テストユーザー");
    expect(profile?.visitCount).toBe(10);
    expect(profile?.commentCount).toBe(50);
    expect(profile?.supportCount).toBe(2);
    expect(profile?.lastSupportAt).toBe("2026-04-01T00:00:00.000Z");
    expect(profile?.firstSeenAt).toBe("2026-01-01T00:00:00.000Z");
    expect(profile?.lastSeenAt).toBe("2026-05-20T00:00:00.000Z");
  });

  it("DB にユーザーが存在しないとき null を返す", async () => {
    vi.mocked(findUserByPlatformUserId).mockResolvedValueOnce(null);

    const profile = await getViewerProfile({
      platform: "twitch",
      platformUserId: "unknown_user",
    });

    expect(profile).toBeNull();
    expect(listCommentsByUserId).not.toHaveBeenCalled();
    expect(listPinnedCommentsByUserId).not.toHaveBeenCalled();
  });

  it("recentComments に CommentHistoryRow から変換した EnrichedComment が入る", async () => {
    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile?.recentComments).toHaveLength(1);
    const comment = profile?.recentComments[0];
    expect(comment?.id).toBe("100");
    expect(comment?.source).toBe("youtube");
    expect(comment?.author).toEqual({
      id: "UC_test_user",
      name: "テストユーザー",
    });
    expect(comment?.text).toBe("こんにちは！");
    expect(comment?.publishedAt).toBe("2026-05-20T22:10:00.000Z");
    expect(comment?.isLowSignal).toBe(false);
    expect(comment?.liveSessionTitle).toBe("テスト配信タイトル");
  });

  it("pinnedComments に PinnedCommentRow から変換した EnrichedComment が入る", async () => {
    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile?.pinnedComments).toHaveLength(1);
    const pinned = profile?.pinnedComments[0];
    expect(pinned?.id).toBe("100");
    expect(pinned?.isPinned).toBe(true);
    expect(pinned?.text).toBe("こんにちは！");
    expect(pinned?.liveSessionTitle).toBe("テスト配信タイトル");
  });

  it("ピン留めされたコメントは recentComments でも isPinned=true になる", async () => {
    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    const recentComment = profile?.recentComments[0];
    expect(recentComment?.isPinned).toBe(true);
  });

  it("liveSessionTitle が null のとき EnrichedComment.liveSessionTitle は undefined になる", async () => {
    vi.mocked(listCommentsByUserId).mockResolvedValueOnce([
      { ...mockCommentRow, liveSessionTitle: null },
    ]);

    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile?.recentComments[0]?.liveSessionTitle).toBeUndefined();
  });

  it("isLowSignal=true のコメントは EnrichedComment.isLowSignal=true になる", async () => {
    vi.mocked(listCommentsByUserId).mockResolvedValueOnce([
      { ...mockCommentRow, isLowSignal: true },
    ]);

    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile?.recentComments[0]?.isLowSignal).toBe(true);
  });

  it("lastSupportAt が null のとき ViewerProfile.lastSupportAt は undefined になる", async () => {
    vi.mocked(findUserByPlatformUserId).mockResolvedValueOnce({
      ...mockUser,
      lastSupportAt: null,
    });

    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile?.lastSupportAt).toBeUndefined();
  });

  it("コメントが 0 件のとき recentComments は空配列になる", async () => {
    vi.mocked(listCommentsByUserId).mockResolvedValueOnce([]);
    vi.mocked(listPinnedCommentsByUserId).mockResolvedValueOnce([]);

    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile?.recentComments).toEqual([]);
    expect(profile?.pinnedComments).toEqual([]);
  });

  it("findUserByPlatformUserId に正しいキーを渡す", async () => {
    await getViewerProfile({
      platform: "twitch",
      platformUserId: "twitch_user_999",
    });

    expect(findUserByPlatformUserId).toHaveBeenCalledWith({
      platform: "twitch",
      platformUserId: "twitch_user_999",
    });
  });

  it("listCommentsByUserId に user.id と VIEWER_PROFILE_HISTORY_LIMIT を渡す", async () => {
    await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(listCommentsByUserId).toHaveBeenCalledWith({
      userId: 1,
      limit: 200,
    });
  });

  it("listPinnedCommentsByUserId に user.id と PINNED_COMMENTS_LIMIT を渡す", async () => {
    await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(listPinnedCommentsByUserId).toHaveBeenCalledWith({
      userId: 1,
      limit: 50,
    });
  });

  it("pinnedRow.commentId が null のとき id に pinned- プレフィックスがつく", async () => {
    vi.mocked(listPinnedCommentsByUserId).mockResolvedValueOnce([
      {
        ...mockPinnedRow,
        commentId: null,
        commentText: null,
        commentedAt: null,
        commentPlatform: null,
        liveSessionId: null,
        liveSessionTitle: null,
        liveSessionPlatformLiveId: null,
        liveSessionStartedAt: null,
      },
    ]);

    const profile = await getViewerProfile({
      platform: "youtube",
      platformUserId: "UC_test_user",
    });

    expect(profile?.pinnedComments[0]?.id).toBe("pinned-1");
    expect(profile?.pinnedComments[0]?.text).toBe("こんにちは！");
    expect(profile?.pinnedComments[0]?.liveSessionTitle).toBeUndefined();
  });
});
