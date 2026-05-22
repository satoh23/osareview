// shared/ui segment の Public API。
// ドメイン非依存の共通 UI コンポーネント（Button, Layout など）を再エクスポートする。
export { Badge } from "./badge";
export type { BadgeProps } from "./badge";
export { Button } from "./button";
export type { ButtonProps } from "./button";
export { PlatformIcon, TwitchMark, YouTubeMark } from "./icons";
export type {
  PlatformIconName,
  PlatformIconProps,
  TwitchMarkProps,
  YouTubeMarkProps,
} from "./icons";
