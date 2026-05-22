import type { SessionPlatform } from "@comment-dock/shared";
import { cx } from "../../../shared/lib";
import { PlatformIcon } from "../../../shared/ui";
import { formatAuthStatus, formatConnectionStatus } from "../model/format";
import type { PlatformSettingState } from "../model/types";

type PlatformConnectionSummaryProps = {
  platformSettings: readonly PlatformSettingState[];
  selectedPlatform: SessionPlatform | null;
  onSelectPlatform: (platform: SessionPlatform) => void;
};

export function PlatformConnectionSummary({
  onSelectPlatform,
  platformSettings,
  selectedPlatform,
}: PlatformConnectionSummaryProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
      {platformSettings.map((setting) => {
        const isConnected = setting.connectionStatus === "connected";
        const isLoggedIn = setting.authStatus === "linked";
        const isError =
          setting.connectionStatus === "error" ||
          setting.authStatus === "expired";
        const isSelected = selectedPlatform === setting.platform;

        return (
          <button
            className={cx(
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition active:scale-[0.98]",
              isError &&
                "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
              !isError &&
                isConnected &&
                "border-success/30 bg-success/10 text-success hover:bg-success/20",
              !isError &&
                !isConnected &&
                "border-border bg-elevated text-muted hover:border-border-strong hover:bg-surface-muted",
              isSelected && "ring-2 ring-ring",
            )}
            key={setting.platform}
            onClick={() => onSelectPlatform(setting.platform)}
            title={`${setting.label}: ${formatConnectionStatus(setting.connectionStatus)} / ${formatAuthStatus(setting.authStatus)}`}
            type="button"
          >
            <span
              className={cx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                setting.platform === "youtube"
                  ? "bg-red-500/10"
                  : "bg-violet-500/10",
              )}
            >
              <PlatformIcon platform={setting.platform} />
            </span>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-primary">
                  {setting.platform === "youtube" ? "YouTube" : "Twitch"}
                </span>
                <span
                  className={cx(
                    "h-2 w-2 rounded-full",
                    isError
                      ? "bg-danger"
                      : isConnected
                        ? "bg-success"
                        : "bg-border-strong",
                  )}
                />
              </div>
              <div className="text-left text-[11px] text-muted">
                {formatConnectionStatus(setting.connectionStatus)} /{" "}
                {isLoggedIn ? "ログイン中" : "未ログイン"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
