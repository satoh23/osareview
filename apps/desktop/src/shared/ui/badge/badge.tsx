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
  "inline-flex items-center rounded-full border font-medium leading-none";

const TONE_CLASS_NAMES: Record<BadgeTone, string> = {
  default: "border-border bg-surface text-secondary",
  pink: "border-brand-pink/30 bg-brand-pink/10 text-brand-pink",
  blue: "border-info/30 bg-info/10 text-info",
  gold: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold",
  red: "border-danger/30 bg-danger/10 text-danger",
  green: "border-success/30 bg-success/10 text-success",
  muted: "border-border bg-surface-muted text-muted",
  purple: "border-brand-purple/30 bg-brand-purple/10 text-brand-purple",
};

const SIZE_CLASS_NAMES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
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
