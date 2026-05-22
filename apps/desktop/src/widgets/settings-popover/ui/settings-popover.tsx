import { motion } from "framer-motion";
import { Settings, X } from "lucide-react";
import { DarkModeToggle, useTheme } from "../../../features/theme";
import { Badge } from "../../../shared/ui";

type SettingsPopoverProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsPopover({ isOpen, onClose }: SettingsPopoverProps) {
  const { isDark } = useTheme();

  if (!isOpen) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      aria-label="設定"
      className="fixed right-5 top-20 z-60 flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-border-strong bg-surface shadow-2xl shadow-black/60"
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      initial={{ opacity: 0, scale: 0.98, y: -10 }}
      role="dialog"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-elevated/80 px-4">
        <div className="flex items-center gap-2 text-sm font-bold text-primary">
          <Settings
            aria-hidden="true"
            className="h-4 w-4 text-brand-pink-strong"
          />
          設定
        </div>
        <button
          aria-label="設定を閉じる"
          className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-primary"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-5 p-4">
        <section className="rounded-2xl border border-border bg-elevated/40 p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-primary">表示</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                配信中に見やすい表示モードを切り替えます。
              </p>
            </div>
            <DarkModeToggle />
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-muted/70 p-3">
            <div>
              <p className="text-sm font-semibold text-primary">ダークモード</p>
              <p className="mt-1 text-xs text-muted">
                現在: {isDark ? "ON" : "OFF"}
              </p>
            </div>
            <Badge tone={isDark ? "pink" : "muted"}>
              {isDark ? "ON" : "OFF"}
            </Badge>
          </div>
        </section>

        <p className="rounded-2xl border border-border bg-elevated/40 p-3 text-xs leading-5 text-muted">
          YouTube / Twitch
          のログイン・接続は、画面左上のプラットフォーム表示をクリックして操作します。
        </p>
      </div>
    </motion.div>
  );
}
