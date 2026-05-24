import { describe, expect, it, vi } from "vitest";

const findUserByPlatformUserIdMock =
  vi.fn<
    (args: { platform: string; platformUserId: string }) => Promise<unknown>
  >();

vi.mock("../../../entities/user", () => ({
  findUserByPlatformUserId: (
    args: Parameters<typeof findUserByPlatformUserIdMock>[0],
  ) => findUserByPlatformUserIdMock(args),
}));

const markPerfMock = vi.fn();
const measurePerfMock = vi.fn();

vi.mock("../../../shared/lib", () => ({
  markPerf: markPerfMock,
  measurePerf: measurePerfMock,
}));

import { findUserByPlatformUserId } from "../../../entities/user";

const mockUser = {
  id: 1,
  platform: "youtube" as const,
  platformUserId: "uc-abc",
  displayName: "テストユーザー",
  firstSeenAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: "2026-05-01T00:00:00.000Z",
  visitCount: 5,
  observedCommentCount: 20,
  supportCount: 0,
  lastSupportAt: null,
};

describe("useViewerUser (repository パス検証)", () => {
  it("findUserByPlatformUserId に platform と platformUserId を渡す", async () => {
    findUserByPlatformUserIdMock.mockResolvedValueOnce(mockUser);

    await findUserByPlatformUserId({
      platform: "youtube",
      platformUserId: "uc-abc",
    });

    expect(findUserByPlatformUserIdMock).toHaveBeenCalledWith({
      platform: "youtube",
      platformUserId: "uc-abc",
    });
  });

  it("findUserByPlatformUserId がユーザーを返す", async () => {
    findUserByPlatformUserIdMock.mockResolvedValueOnce(mockUser);

    const result = await findUserByPlatformUserId({
      platform: "youtube",
      platformUserId: "uc-abc",
    });

    expect(result).toEqual(mockUser);
  });

  it("findUserByPlatformUserId がユーザー未登録のとき null を返す", async () => {
    findUserByPlatformUserIdMock.mockResolvedValueOnce(null);

    const result = await findUserByPlatformUserId({
      platform: "youtube",
      platformUserId: "unknown",
    });

    expect(result).toBeNull();
  });

  it("findUserByPlatformUserId がエラーを投げる", async () => {
    findUserByPlatformUserIdMock.mockRejectedValueOnce(new Error("DB エラー"));

    await expect(
      findUserByPlatformUserId({
        platform: "youtube",
        platformUserId: "uc-err",
      }),
    ).rejects.toThrow("DB エラー");
  });
});
