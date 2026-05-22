import type {
  ConnectionTargetMode,
  PlatformAuthStatus,
  PlatformConnectionStatus,
  TokenStatus,
} from "./types";

export function formatAuthStatus(status: PlatformAuthStatus): string {
  switch (status) {
    case "linked":
      return "ログイン中";
    case "expired":
      return "再ログインが必要";
    case "unlinked":
      return "未ログイン";
  }
}

export function formatConnectionStatus(
  status: PlatformConnectionStatus,
): string {
  switch (status) {
    case "connected":
      return "接続中";
    case "connecting":
      return "接続処理中";
    case "error":
      return "接続エラー";
    case "disconnected":
      return "未接続";
  }
}

export function formatLoginDetail(status: TokenStatus): string {
  switch (status) {
    case "available":
      return "ログイン済み";
    case "expired":
      return "もう一度ログインしてください";
    case "missing":
      return "ログインしてください";
  }
}

export function formatConnectionTargetMode(mode: ConnectionTargetMode): string {
  return mode === "own_account" ? "ログイン中のアカウント" : "配信ID指定";
}
