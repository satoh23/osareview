import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionPlatform } from "@comment-dock/shared";
import { cx } from "../../../shared/lib";
import { Badge, Button, PlatformIcon } from "../../../shared/ui";
import { canConnectPlatform } from "../model/platform-selectors";
import {
  formatAuthStatus,
  formatConnectionStatus,
  formatConnectionTargetMode,
  formatLoginDetail,
} from "../model/format";
import type {
  ConnectionTargetMode,
  PlatformSettingState,
} from "../model/types";
import { ConnectionTargetPicker } from "./connection-target-picker";

type PlatformQuickPopoverProps = {
  setting: PlatformSettingState;
  onClose: () => void;
  onToggleAuth: (platform: SessionPlatform) => void;
  onToggleConnection: (platform: SessionPlatform) => void;
  onChangeTargetMode: (
    platform: SessionPlatform,
    mode: ConnectionTargetMode,
  ) => void;
  onChangeStreamId: (platform: SessionPlatform, streamId: string) => void;
};

export function PlatformQuickPopover({
  onChangeStreamId,
  onChangeTargetMode,
  onClose,
  onToggleAuth,
  onToggleConnection,
  setting,
}: PlatformQuickPopoverProps) {
  const isLoggedIn = setting.authStatus === "linked";
  const isConnected = setting.connectionStatus === "connected";
  const isConnecting =
    setting.connectionStatus === "connecting" ||
    (setting.isRequesting && isLoggedIn && !isConnected);
  const canConnect = canConnectPlatform(setting);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="fixed left-5 top-18 z-70 w-[360px] overflow-hidden rounded-3xl border border-border-strong bg-surface shadow-2xl shadow-black/60"
      exit={{ opacity: 0, scale: 0.98, y: -6 }}
      initial={{ opacity: 0, scale: 0.98, y: -6 }}
    >
      <div className="flex items-center justify-between border-b border-border bg-elevated/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cx(
              "flex h-9 w-9 items-center justify-center rounded-2xl",
              setting.platform === "youtube"
                ? "bg-red-500/10"
                : "bg-violet-500/10",
            )}
          >
            <PlatformIcon platform={setting.platform} />
          </div>
          <div>
            <p className="text-sm font-bold text-primary">{setting.label}</p>
            <p className="text-xs text-muted">
              {setting.accountName ?? "未ログイン"}
            </p>
          </div>
        </div>
        <button
          aria-label="プラットフォーム操作を閉じる"
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-primary"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <StatusPanel
            detail={formatLoginDetail(setting.tokenStatus)}
            label="ログイン状況"
          >
            <Badge
              tone={
                isLoggedIn
                  ? "blue"
                  : setting.authStatus === "expired"
                    ? "gold"
                    : "muted"
              }
            >
              {formatAuthStatus(setting.authStatus)}
            </Badge>
          </StatusPanel>
          <StatusPanel
            detail={formatConnectionTargetMode(setting.connectionTargetMode)}
            label="コメント接続"
          >
            <Badge
              tone={
                isConnected
                  ? "green"
                  : setting.connectionStatus === "error"
                    ? "red"
                    : "muted"
              }
            >
              {formatConnectionStatus(setting.connectionStatus)}
            </Badge>
          </StatusPanel>
        </div>

        <ConnectionTargetPicker
          onChangeStreamId={onChangeStreamId}
          onChangeTargetMode={onChangeTargetMode}
          setting={setting}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={setting.isRequesting}
            onClick={() => onToggleAuth(setting.platform)}
            type="button"
            variant={isLoggedIn ? "secondary" : "primary"}
          >
            {isLoggedIn ? "ログアウト" : "ログイン"}
          </Button>
          <Button
            className={!canConnect && !isConnected ? "opacity-50" : undefined}
            disabled={
              isConnecting ||
              setting.isRequesting ||
              (!canConnect && !isConnected)
            }
            onClick={() => onToggleConnection(setting.platform)}
            type="button"
            variant={isConnected ? "danger" : "secondary"}
          >
            {isConnecting ? "接続中" : isConnected ? "切断" : "接続"}
          </Button>
        </div>

        {!isLoggedIn ? (
          <WarningMessage>
            コメント接続するには、先にログインしてください。
          </WarningMessage>
        ) : null}
        {isLoggedIn &&
        setting.connectionTargetMode === "stream_id" &&
        !setting.streamIdInput?.trim() ? (
          <WarningMessage>
            配信IDを入力すると、ログイン中のアカウントとは別の配信にも接続できます。
          </WarningMessage>
        ) : null}
        {setting.error ? (
          <WarningMessage>{setting.error}</WarningMessage>
        ) : null}
      </div>
    </motion.div>
  );
}

function StatusPanel({
  children,
  detail,
  label,
}: {
  children: ReactNode;
  detail: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <div className="mt-1">{children}</div>
      <p className="mt-2 text-[11px] text-muted/80">{detail}</p>
    </div>
  );
}

function WarningMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-brand-gold/20 bg-brand-gold/10 p-3 text-xs leading-5 text-brand-gold/80">
      {children}
    </p>
  );
}
