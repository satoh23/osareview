import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib";

export type YouTubeMarkProps = ComponentPropsWithoutRef<"svg"> & {
  title?: string;
};

export function YouTubeMark({ className, title, ...props }: YouTubeMarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={cx("h-5 w-5", className)}
      fill="none"
      role={title ? "img" : undefined}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M21.58 7.19a2.76 2.76 0 0 0-1.94-1.96C17.93 4.77 12 4.77 12 4.77s-5.93 0-7.64.46a2.76 2.76 0 0 0-1.94 1.96A28.7 28.7 0 0 0 1.96 12a28.7 28.7 0 0 0 .46 4.81 2.76 2.76 0 0 0 1.94 1.96c1.71.46 7.64.46 7.64.46s5.93 0 7.64-.46a2.76 2.76 0 0 0 1.94-1.96A28.7 28.7 0 0 0 22.04 12a28.7 28.7 0 0 0-.46-4.81Z"
        fill="#FF0000"
      />
      <path d="m10 15.27 5.18-3.27L10 8.73v6.54Z" fill="#FFFFFF" />
    </svg>
  );
}
