import { useCallback, useMemo, useState } from "react";
import { SESSION_PLATFORMS, type SessionPlatform } from "@comment-dock/shared";
import {
  useAccountLink,
  useLinkAccount,
  useUnlinkAccount,
} from "../../account-link";
import {
  useSessionState,
  useStartSession,
  useStopSession,
} from "../../streaming-session";
import { ACCOUNT_LINK_WARN_MESSAGES } from "../../../shared/const";
import { STREAMING_SESSION_WARN_MESSAGES } from "../../../shared/const";
import {
  canConnectPlatform,
  DISPLAY_PLATFORMS,
  selectPlatformSetting,
} from "./platform-selectors";
import type { ConnectionTargetMode, PlatformSettingState } from "./types";

type PlatformLocalSettings = Record<
  SessionPlatform,
  {
    connectionTargetMode: ConnectionTargetMode;
    streamIdInput: string;
  }
>;

export type PlatformSettingsState = {
  platformSettings: PlatformSettingState[];
  changeConnectionTargetMode: (
    platform: SessionPlatform,
    mode: ConnectionTargetMode,
  ) => void;
  changeStreamId: (platform: SessionPlatform, streamId: string) => void;
  toggleAuth: (platform: SessionPlatform) => Promise<void>;
  toggleConnection: (platform: SessionPlatform) => Promise<void>;
};

const createInitialLocalSettings = (): PlatformLocalSettings => ({
  [SESSION_PLATFORMS.YOUTUBE]: {
    connectionTargetMode: "own_account",
    streamIdInput: "",
  },
  [SESSION_PLATFORMS.TWITCH]: {
    connectionTargetMode: "own_account",
    streamIdInput: "",
  },
});

export function usePlatformSettings(): PlatformSettingsState {
  const youtubeAccount = useAccountLink(SESSION_PLATFORMS.YOUTUBE);
  const twitchAccount = useAccountLink(SESSION_PLATFORMS.TWITCH);
  const youtubeSession = useSessionState(SESSION_PLATFORMS.YOUTUBE);
  const twitchSession = useSessionState(SESSION_PLATFORMS.TWITCH);
  const linkAccount = useLinkAccount();
  const unlinkAccount = useUnlinkAccount();
  const startSession = useStartSession();
  const stopSession = useStopSession();
  const [localSettings, setLocalSettings] = useState(
    createInitialLocalSettings,
  );

  const platformSettings = useMemo(
    () =>
      DISPLAY_PLATFORMS.map((platform) =>
        selectPlatformSetting({
          platform,
          account:
            platform === SESSION_PLATFORMS.YOUTUBE
              ? youtubeAccount
              : twitchAccount,
          session:
            platform === SESSION_PLATFORMS.YOUTUBE
              ? youtubeSession
              : twitchSession,
          connectionTargetMode: localSettings[platform].connectionTargetMode,
          streamIdInput: localSettings[platform].streamIdInput,
        }),
      ),
    [
      localSettings,
      twitchAccount,
      twitchSession,
      youtubeAccount,
      youtubeSession,
    ],
  );

  const changeStreamId = useCallback(
    (platform: SessionPlatform, streamId: string) => {
      setLocalSettings((current) => ({
        ...current,
        [platform]: {
          ...current[platform],
          streamIdInput: streamId,
        },
      }));
    },
    [],
  );

  const changeConnectionTargetMode = useCallback(
    (platform: SessionPlatform, mode: ConnectionTargetMode) => {
      setLocalSettings((current) => ({
        ...current,
        [platform]: {
          ...current[platform],
          connectionTargetMode: mode,
        },
      }));
      // TODO(backend): stream_id 指定接続 API ができたら、ここで対象配信 ID を backend へ渡す。
      void stopSession(platform).catch((error: unknown) => {
        console.warn(
          STREAMING_SESSION_WARN_MESSAGES.FAILED_TO_STOP_SESSION,
          error,
        );
      });
    },
    [stopSession],
  );

  const toggleAuth = useCallback(
    async (platform: SessionPlatform) => {
      const setting = platformSettings.find(
        (item) => item.platform === platform,
      );
      if (!setting) {
        return;
      }

      try {
        if (setting.authStatus === "linked") {
          await unlinkAccount(platform);
          return;
        }
        await linkAccount(platform);
      } catch (error) {
        console.warn(
          setting.authStatus === "linked"
            ? ACCOUNT_LINK_WARN_MESSAGES.FAILED_TO_UNLINK_ACCOUNT
            : ACCOUNT_LINK_WARN_MESSAGES.FAILED_TO_LINK_ACCOUNT,
          error,
        );
      }
    },
    [linkAccount, platformSettings, unlinkAccount],
  );

  const toggleConnection = useCallback(
    async (platform: SessionPlatform) => {
      const setting = platformSettings.find(
        (item) => item.platform === platform,
      );
      if (!setting) {
        return;
      }

      try {
        if (setting.connectionStatus === "connected") {
          await stopSession(platform);
          return;
        }
        if (!canConnectPlatform(setting)) {
          return;
        }
        // TODO(backend): connectionTargetMode=stream_id の場合は streamIdInput を接続 API に渡す。
        await startSession(platform);
      } catch (error) {
        console.warn(
          setting.connectionStatus === "connected"
            ? STREAMING_SESSION_WARN_MESSAGES.FAILED_TO_STOP_SESSION
            : STREAMING_SESSION_WARN_MESSAGES.FAILED_TO_START_SESSION,
          error,
        );
      }
    },
    [platformSettings, startSession, stopSession],
  );

  return {
    platformSettings,
    changeConnectionTargetMode,
    changeStreamId,
    toggleAuth,
    toggleConnection,
  };
}
