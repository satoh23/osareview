import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib";

export type TwitchMarkProps = ComponentPropsWithoutRef<"svg"> & {
  title?: string;
};

export function TwitchMark({ className, title, ...props }: TwitchMarkProps) {
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
        d="M4.5 3 3 6.75v12h4.5V21h3l2.25-2.25h3.75L21 14.25V3H4.5Z"
        fill="#9146FF"
      />
      <path
        d="M18.75 13.5 16.5 15.75H12l-2.25 2.25v-2.25H6V5.25h12.75v8.25Z"
        fill="#FFFFFF"
      />
      <path d="M15.75 8.25H17.25V12H15.75V8.25Z" fill="#9146FF" />
      <path d="M11.25 8.25H12.75V12H11.25V8.25Z" fill="#9146FF" />
    </svg>
  );
}
