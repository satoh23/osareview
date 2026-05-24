import { cx } from "../../../shared/lib";
import {
  formatHistoryMode,
  type HistoryMode,
} from "../../../entities/viewer-profile";

type CommentHistoryFilterTabsProps = {
  mode: HistoryMode;
  onChange: (mode: HistoryMode) => void;
};

const HISTORY_MODES: HistoryMode[] = ["all", "filtered", "important"];

export function CommentHistoryFilterTabs({
  mode,
  onChange,
}: CommentHistoryFilterTabsProps) {
  return (
    <div className="mb-3 grid grid-cols-3 rounded-4xl border border-border bg-elevated">
      {HISTORY_MODES.map((item) => (
        <button
          className={cx(
            "flex min-w-0 items-center justify-center truncate rounded-4xl px-2 py-1 text-center text-[8px] font-medium leading-tight transition",
            mode === item
              ? "bg-brand-pink text-inverse"
              : "text-muted hover:text-secondary",
          )}
          key={item}
          onClick={() => onChange(item)}
          title={formatHistoryMode(item)}
          type="button"
        >
          {formatHistoryMode(item)}
        </button>
      ))}
    </div>
  );
}
