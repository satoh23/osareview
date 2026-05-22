import { Settings } from "lucide-react";
import {
  LowSignalFilterToggle,
  PlatformConnectionSummary,
  PlatformQuickPopover,
  usePlatformPopoverState,
  usePlatformSettings,
} from "../../../features";
import { Button } from "../../../shared/ui";

type HeaderBarProps = {
  onOpenSettings: () => void;
};

export function HeaderBar({ onOpenSettings }: HeaderBarProps) {
  const {
    changeConnectionTargetMode,
    changeStreamId,
    platformSettings,
    toggleAuth,
    toggleConnection,
  } = usePlatformSettings();
  const {
    closePlatformPopover,
    selectPlatform,
    selectedPlatform,
    selectedPlatformSetting,
  } = usePlatformPopoverState(platformSettings);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-base/95 px-5">
        <PlatformConnectionSummary
          onSelectPlatform={selectPlatform}
          platformSettings={platformSettings}
          selectedPlatform={selectedPlatform}
        />
        <div className="flex shrink-0 items-center gap-3">
          <LowSignalFilterToggle />
          <Button onClick={onOpenSettings} type="button" variant="ghost">
            <Settings aria-hidden="true" className="h-4 w-4" />
            設定
          </Button>
        </div>
      </header>

      {selectedPlatformSetting ? (
        <PlatformQuickPopover
          key={selectedPlatformSetting.platform}
          onChangeStreamId={changeStreamId}
          onChangeTargetMode={changeConnectionTargetMode}
          onClose={closePlatformPopover}
          onToggleAuth={(platform) => {
            void toggleAuth(platform);
          }}
          onToggleConnection={(platform) => {
            void toggleConnection(platform);
          }}
          setting={selectedPlatformSetting}
        />
      ) : null}
    </>
  );
}
