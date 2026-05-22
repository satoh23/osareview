import { Filter } from "lucide-react";
import { cx } from "../../../shared/lib";
import { useCommentStreamFilter } from "../model/filter-context";

export function LowSignalFilterToggle() {
  const { hideLowSignal, toggleHideLowSignal } = useCommentStreamFilter();

  return (
    <button
      aria-pressed={hideLowSignal}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base",
        hideLowSignal
          ? "border-success/30 bg-success/10 text-success"
          : "border-border bg-elevated text-muted hover:border-border-strong hover:text-secondary",
      )}
      onClick={toggleHideLowSignal}
      type="button"
    >
      <Filter aria-hidden="true" className="h-3.5 w-3.5" />
      低シグナル除外 {hideLowSignal ? "ON" : "OFF"}
    </button>
  );
}
