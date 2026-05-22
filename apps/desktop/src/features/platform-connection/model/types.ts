import type { SessionPlatform } from "@comment-dock/shared";

export type PlatformAuthStatus = "linked" | "unlinked" | "expired";
export type PlatformConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "error";
export type TokenStatus = "available" | "missing" | "expired";
export type ConnectionTargetMode = "own_account" | "stream_id";

export type PlatformSettingState = {
  platform: SessionPlatform;
  label: string;
  accountName?: string;
  authStatus: PlatformAuthStatus;
  connectionStatus: PlatformConnectionStatus;
  tokenStatus: TokenStatus;
  lastTokenAcquiredAt?: string;
  connectionTargetMode: ConnectionTargetMode;
  streamIdInput?: string;
  isRequesting: boolean;
  error?: string;
};
