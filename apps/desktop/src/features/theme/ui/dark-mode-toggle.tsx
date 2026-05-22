import { cx } from "../../../shared/lib";
import { useTheme } from "../model/theme-context";

export function DarkModeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark
    ? "ライトモードに切り替える"
    : "ダークモードに切り替える";

  return (
    <button
      aria-checked={isDark}
      aria-label={label}
      className={cx(
        "relative h-7 w-12 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base",
        isDark
          ? "border-brand-pink-strong/40 bg-brand-pink/30"
          : "border-border-strong bg-border-strong",
      )}
      onClick={toggleTheme}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
          isDark ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}
