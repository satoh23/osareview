// features/platform-connection slice の Public API。
export {
  canConnectPlatform,
  DISPLAY_PLATFORMS,
  PLATFORM_LABELS,
  selectPlatformSetting,
} from "./model/platform-selectors";
export {
  formatAuthStatus,
  formatConnectionStatus,
  formatConnectionTargetMode,
  formatLoginDetail,
} from "./model/format";
export { usePlatformPopoverState } from "./model/use-platform-popover-state";
export { usePlatformSettings } from "./model/use-platform-settings";
export type {
  ConnectionTargetMode,
  PlatformAuthStatus,
  PlatformConnectionStatus,
  PlatformSettingState,
  TokenStatus,
} from "./model/types";
export { ConnectionTargetPicker } from "./ui/connection-target-picker";
export { PlatformConnectionSummary } from "./ui/platform-connection-summary";
export { PlatformQuickPopover } from "./ui/platform-quick-popover";
