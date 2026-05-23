import { describe, expect, it } from "vitest";
import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  SESSION_STATES,
  type AccountLinkSnapshot,
  type StreamingSessionSnapshot,
} from "@comment-dock/shared";
import type { AccountLinkStatus } from "../../account-link";
import type { StreamingSessionStatus } from "../../streaming-session";
import {
  canConnectPlatform,
  selectPlatformSetting,
} from "./platform-selectors";

describe("selectPlatformSetting", () => {
  it("linked/connected の状態をプロトタイプ用 view state に変換する", () => {
    const setting = selectPlatformSetting({
      platform: SESSION_PLATFORMS.YOUTUBE,
      account: createAccountStatus({
        provider: SESSION_PLATFORMS.YOUTUBE,
        state: ACCOUNT_LINK_STATES.LINKED,
      }),
      session: createSessionStatus({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.CONNECTED,
      }),
      connectionTargetMode: "own_account",
    });

    expect(setting).toMatchObject({
      platform: "youtube",
      label: "YouTube Live",
      authStatus: "linked",
      connectionStatus: "connected",
      tokenStatus: "available",
      connectionTargetMode: "own_account",
    });
    expect(canConnectPlatform(setting)).toBe(true);
  });

  it("stream_id モードでは配信 ID がないと接続不可にする", () => {
    const setting = selectPlatformSetting({
      platform: SESSION_PLATFORMS.TWITCH,
      account: createAccountStatus({
        provider: SESSION_PLATFORMS.TWITCH,
        state: ACCOUNT_LINK_STATES.LINKED,
      }),
      session: createSessionStatus({
        platform: SESSION_PLATFORMS.TWITCH,
        state: SESSION_STATES.IDLE,
      }),
      connectionTargetMode: "stream_id",
      streamIdInput: "",
    });

    expect(setting.connectionStatus).toBe("disconnected");
    expect(canConnectPlatform(setting)).toBe(false);
  });

  it("HTTP 失敗由来の error 文字列は表示用 error に含めず、snapshot.reason のみ含める", () => {
    const setting = selectPlatformSetting({
      platform: SESSION_PLATFORMS.YOUTUBE,
      account: {
        snapshot: {
          provider: SESSION_PLATFORMS.YOUTUBE,
          state: ACCOUNT_LINK_STATES.LINKING,
        },
        isRequesting: false,
        error: "Load failed",
      },
      session: {
        snapshot: {
          platform: SESSION_PLATFORMS.YOUTUBE,
          state: SESSION_STATES.IDLE,
        },
        isRequesting: false,
        error: "Failed to fetch",
      },
      connectionTargetMode: "own_account",
    });

    expect(setting.error).toBeUndefined();

    const withReason = selectPlatformSetting({
      platform: SESSION_PLATFORMS.YOUTUBE,
      account: {
        snapshot: {
          provider: SESSION_PLATFORMS.YOUTUBE,
          state: ACCOUNT_LINK_STATES.FAILED,
          reason: "認証の有効期限が切れました",
        },
        isRequesting: false,
        error: "Load failed",
      },
      session: createSessionStatus({
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.IDLE,
      }),
      connectionTargetMode: "own_account",
    });

    expect(withReason.error).toBe("認証の有効期限が切れました");
  });
});

const createAccountStatus = (
  snapshot: AccountLinkSnapshot,
): AccountLinkStatus => ({
  snapshot,
  isRequesting: false,
});

const createSessionStatus = (
  snapshot: StreamingSessionSnapshot,
): StreamingSessionStatus => ({
  snapshot,
  isRequesting: false,
});
