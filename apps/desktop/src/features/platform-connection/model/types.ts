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
  /**
   * 画面に載せるのはゲートウェイ等が返した `snapshot.reason` のみとし、
   * クライアント HTTP 失敗時のロードフェイル／Failed to fetch などの文言は含めない。
   */
  error?: string;
};
