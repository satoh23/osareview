import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const BASE_CLASS_NAME =
  "inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base";

const VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-pink text-inverse shadow-lg shadow-brand-pink-shadow hover:bg-brand-pink-strong",
  secondary:
    "border border-border-strong bg-surface-muted text-primary hover:bg-border-strong",
  ghost: "text-secondary hover:bg-surface-muted hover:text-primary",
  danger: "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
};

const SIZE_CLASS_NAMES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5",
  md: "px-3 py-2",
  lg: "px-4 py-2.5",
};

export function Button({
  children,
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        BASE_CLASS_NAME,
        VARIANT_CLASS_NAMES[variant],
        SIZE_CLASS_NAMES[size],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
