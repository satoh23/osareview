import { useCallback, useMemo, useState } from "react";
import type { SessionPlatform } from "@comment-dock/shared";
import type { PlatformSettingState } from "./types";

export function usePlatformPopoverState(
  platformSettings: readonly PlatformSettingState[],
) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<SessionPlatform | null>(null);

  const selectedPlatformSetting = useMemo(
    () =>
      platformSettings.find((setting) => setting.platform === selectedPlatform),
    [platformSettings, selectedPlatform],
  );

  const selectPlatform = useCallback((platform: SessionPlatform) => {
    setSelectedPlatform((current) => (current === platform ? null : platform));
  }, []);

  const closePlatformPopover = useCallback(() => {
    setSelectedPlatform(null);
  }, []);

  return {
    selectedPlatform,
    selectedPlatformSetting,
    selectPlatform,
    closePlatformPopover,
  };
}
