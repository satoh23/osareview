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
  "inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base";

const VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
  primary:
    "border-brand-pink bg-brand-pink text-inverse shadow-soft hover:bg-brand-pink-strong hover:border-brand-pink-strong",
  secondary:
    "border-border bg-surface text-primary shadow-sm hover:border-border-strong hover:bg-surface-muted",
  ghost:
    "border-transparent bg-transparent text-secondary hover:bg-surface-muted hover:text-primary",
  danger: "border-danger bg-danger text-inverse shadow-sm hover:brightness-95",
};

const SIZE_CLASS_NAMES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
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
