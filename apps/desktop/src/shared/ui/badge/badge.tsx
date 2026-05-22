import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib";

type BadgeTone =
  | "default"
  | "pink"
  | "blue"
  | "gold"
  | "red"
  | "green"
  | "muted"
  | "purple";
type BadgeSize = "sm" | "md";

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
};

const BASE_CLASS_NAME =
  "inline-flex items-center rounded-full border font-medium leading-4";

const TONE_CLASS_NAMES: Record<BadgeTone, string> = {
  default: "border-border-strong bg-surface-muted/80 text-secondary",
  pink: "border-brand-pink-strong/30 bg-brand-pink/10 text-brand-pink-strong",
  blue: "border-info/30 bg-info/10 text-info",
  gold: "border-brand-gold/40 bg-brand-gold/10 text-brand-gold",
  red: "border-danger/40 bg-danger/10 text-danger",
  green: "border-success/40 bg-success/10 text-success",
  muted: "border-border-strong bg-elevated text-muted",
  purple: "border-brand-purple/40 bg-brand-purple/10 text-brand-purple",
};

const SIZE_CLASS_NAMES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  children,
  className,
  size = "sm",
  tone = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx(
        BASE_CLASS_NAME,
        TONE_CLASS_NAMES[tone],
        SIZE_CLASS_NAMES[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
