import {
  SESSION_PLATFORMS,
  SESSION_STATES,
  type SessionPlatform,
  type SessionState,
} from "@comment-dock/shared";
import {
  useSessionState,
  useStartSession,
  useStopSession,
  type StreamingSessionStatus,
} from "../../../features/streaming-session";
import { STREAMING_SESSION_WARN_MESSAGES } from "../../../shared/const";
import styles from "./connection-status-panel.module.css";

const SESSION_STATE_LABELS: Record<SessionState, string> = {
  idle: "未接続",
  connecting: "接続中…",
  connected: "接続済",
  failed: "接続失敗",
};

const PLATFORM_LABELS: Record<SessionPlatform, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
};

const SESSION_PLATFORMS_FOR_DISPLAY = [
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
] as const satisfies readonly SessionPlatform[];

export function ConnectionStatusPanel() {
  return (
    <section className={styles.panel} aria-labelledby="connection-panel-title">
      <h2 className={styles.title} id="connection-panel-title">
        接続情報
      </h2>
      <div className={styles.list}>
        {SESSION_PLATFORMS_FOR_DISPLAY.map((platform) => (
          <StreamingSessionRow key={platform} platform={platform} />
        ))}
      </div>
    </section>
  );
}

function StreamingSessionRow({ platform }: { platform: SessionPlatform }) {
  const session = useSessionState(platform);
  const startSession = useStartSession();
  const stopSession = useStopSession();
  const canStart =
    !session.isRequesting &&
    (session.snapshot.state === SESSION_STATES.IDLE ||
      session.snapshot.state === SESSION_STATES.FAILED);
  const canStop =
    !session.isRequesting &&
    (session.snapshot.state === SESSION_STATES.CONNECTING ||
      session.snapshot.state === SESSION_STATES.CONNECTED);

  async function handleStart() {
    try {
      await startSession(platform);
    } catch (error) {
      console.warn(
        STREAMING_SESSION_WARN_MESSAGES.FAILED_TO_START_SESSION,
        error,
      );
    }
  }

  async function handleStop() {
    try {
      await stopSession(platform);
    } catch (error) {
      console.warn(
        STREAMING_SESSION_WARN_MESSAGES.FAILED_TO_STOP_SESSION,
        error,
      );
    }
  }

  return (
    <div className={styles.row}>
      <div className={styles.summary}>
        <strong>{PLATFORM_LABELS[platform]}</strong>
        <span className={styles.status}>{getSessionStatusLabel(session)}</span>
      </div>
      <div className={styles.actions}>
        <button type="button" disabled={!canStart} onClick={handleStart}>
          配信開始
        </button>
        <button type="button" disabled={!canStop} onClick={handleStop}>
          停止
        </button>
      </div>
    </div>
  );
}

const getSessionStatusLabel = (session: StreamingSessionStatus): string => {
  const baseLabel = SESSION_STATE_LABELS[session.snapshot.state];
  if (session.isRequesting) {
    return `${baseLabel}（処理中）`;
  }
  if (session.error) {
    return `${baseLabel}（${session.error}）`;
  }
  if (session.snapshot.reason) {
    return `${baseLabel}（${session.snapshot.reason}）`;
  }
  return baseLabel;
};
