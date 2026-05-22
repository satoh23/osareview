import type { ComponentPropsWithoutRef } from "react";
import { TwitchMark } from "./twitch-mark";
import { YouTubeMark } from "./youtube-mark";

export type PlatformIconName = "youtube" | "twitch";

export type PlatformIconProps = ComponentPropsWithoutRef<"svg"> & {
  platform: PlatformIconName;
  title?: string;
};

export function PlatformIcon({ platform, ...props }: PlatformIconProps) {
  switch (platform) {
    case "youtube":
      return <YouTubeMark {...props} />;
    case "twitch":
      return <TwitchMark {...props} />;
  }
}
