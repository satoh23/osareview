import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  SESSION_STATES,
  type AccountLinkState,
  type SessionPlatform,
  type SessionState,
} from "@comment-dock/shared";
import type { AccountLinkStatus } from "../../account-link";
import type { StreamingSessionStatus } from "../../streaming-session";
import type {
  ConnectionTargetMode,
  PlatformAuthStatus,
  PlatformConnectionStatus,
  PlatformSettingState,
  TokenStatus,
} from "./types";

export const DISPLAY_PLATFORMS = [
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
] as const satisfies readonly SessionPlatform[];

export const PLATFORM_LABELS: Record<SessionPlatform, string> = {
  youtube: "YouTube Live",
  twitch: "Twitch",
};

export type PlatformSelectorInput = {
  platform: SessionPlatform;
  account: AccountLinkStatus;
  session: StreamingSessionStatus;
  connectionTargetMode: ConnectionTargetMode;
  streamIdInput?: string;
};

export function selectPlatformSetting({
  account,
  connectionTargetMode,
  platform,
  session,
  streamIdInput,
}: PlatformSelectorInput): PlatformSettingState {
  return {
    platform,
    label: PLATFORM_LABELS[platform],
    authStatus: selectAuthStatus(account.snapshot.state),
    connectionStatus: selectConnectionStatus(session.snapshot.state),
    tokenStatus: selectTokenStatus(account.snapshot.state),
    connectionTargetMode,
    streamIdInput,
    isRequesting: account.isRequesting || session.isRequesting,
    error:
      account.error ??
      session.error ??
      account.snapshot.reason ??
      session.snapshot.reason,
  };
}

export function canConnectPlatform(setting: PlatformSettingState): boolean {
  if (setting.authStatus !== "linked" || setting.isRequesting) {
    return false;
  }
  if (setting.connectionTargetMode === "stream_id") {
    return Boolean(setting.streamIdInput?.trim());
  }
  return true;
}

const selectAuthStatus = (state: AccountLinkState): PlatformAuthStatus => {
  switch (state) {
    case ACCOUNT_LINK_STATES.LINKED:
      return "linked";
    case ACCOUNT_LINK_STATES.FAILED:
      return "expired";
    case ACCOUNT_LINK_STATES.LINKING:
    case ACCOUNT_LINK_STATES.UNLINKED:
      return "unlinked";
  }
};

const selectTokenStatus = (state: AccountLinkState): TokenStatus => {
  switch (state) {
    case ACCOUNT_LINK_STATES.LINKED:
      return "available";
    case ACCOUNT_LINK_STATES.FAILED:
      return "expired";
    case ACCOUNT_LINK_STATES.LINKING:
    case ACCOUNT_LINK_STATES.UNLINKED:
      return "missing";
  }
};

const selectConnectionStatus = (
  state: SessionState,
): PlatformConnectionStatus => {
  switch (state) {
    case SESSION_STATES.CONNECTED:
      return "connected";
    case SESSION_STATES.CONNECTING:
      return "connecting";
    case SESSION_STATES.FAILED:
      return "error";
    case SESSION_STATES.IDLE:
      return "disconnected";
  }
};
