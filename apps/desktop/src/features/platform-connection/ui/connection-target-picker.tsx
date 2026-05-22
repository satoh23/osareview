import type { SessionPlatform } from "@comment-dock/shared";
import { cx } from "../../../shared/lib";
import type {
  ConnectionTargetMode,
  PlatformSettingState,
} from "../model/types";

type ConnectionTargetPickerProps = {
  setting: PlatformSettingState;
  onChangeTargetMode: (
    platform: SessionPlatform,
    mode: ConnectionTargetMode,
  ) => void;
  onChangeStreamId: (platform: SessionPlatform, streamId: string) => void;
};

export function ConnectionTargetPicker({
  onChangeStreamId,
  onChangeTargetMode,
  setting,
}: ConnectionTargetPickerProps) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/40 p-3">
      <p className="mb-2 text-xs font-semibold text-secondary">接続先</p>
      <div className="grid grid-cols-1 gap-2">
        <TargetButton
          active={setting.connectionTargetMode === "own_account"}
          description="自分の配信コメントに接続します。"
          label="ログイン中のアカウントの配信"
          onClick={() => onChangeTargetMode(setting.platform, "own_account")}
        />
        <TargetButton
          active={setting.connectionTargetMode === "stream_id"}
          description="別アカウントの配信に接続したい場合はこちら。"
          label="配信IDを入力して接続"
          onClick={() => onChangeTargetMode(setting.platform, "stream_id")}
        />
      </div>
      {setting.connectionTargetMode === "stream_id" ? (
        <div className="mt-3">
          <input
            className="w-full rounded-2xl border border-border bg-elevated px-3 py-2 text-sm text-primary outline-none ring-brand-pink/30 placeholder:text-muted focus:ring-2"
            onChange={(event) =>
              onChangeStreamId(setting.platform, event.target.value)
            }
            placeholder={
              setting.platform === "youtube"
                ? "YouTubeの配信ID / Live ID"
                : "Twitchのチャンネル名または配信ID"
            }
            value={setting.streamIdInput ?? ""}
          />
          <p className="mt-2 text-[11px] text-muted">
            ログイン中のアカウントとは別の配信を見る場合に使います。
          </p>
        </div>
      ) : null}
    </div>
  );
}

function TargetButton({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cx(
        "rounded-2xl border p-3 text-left transition",
        active
          ? "border-brand-pink-strong/50 bg-brand-pink/10"
          : "border-border bg-surface-muted/60 hover:bg-surface-muted",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="text-sm font-semibold text-primary">{label}</div>
      <div className="mt-1 text-xs text-muted">{description}</div>
    </button>
  );
}
