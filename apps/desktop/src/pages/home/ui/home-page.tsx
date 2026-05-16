import { useState } from "react";
import {
  SESSION_PLATFORMS,
  type SessionPlatform,
  type SessionState,
} from "@comment-dock/shared";
import reactLogo from "../../../assets/react.svg";
import {
  useSessionState,
  useStartSession,
  useStopSession,
  type StreamingSessionStatus,
} from "../../../features/streaming-session";
import { tauriCommands } from "../../../shared/api/tauri";
import "./home-page.css";

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

export function HomePage() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await tauriCommands.greet(name));
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>

      <section className="session-panel" aria-labelledby="session-panel-title">
        <h2 id="session-panel-title">配信セッション</h2>
        <StreamingSessionRow platform={SESSION_PLATFORMS.YOUTUBE} />
        <StreamingSessionRow platform={SESSION_PLATFORMS.TWITCH} />
      </section>
    </main>
  );
}

function StreamingSessionRow({ platform }: { platform: SessionPlatform }) {
  const session = useSessionState(platform);
  const startSession = useStartSession();
  const stopSession = useStopSession();
  const canStart =
    !session.isRequesting &&
    (session.snapshot.state === "idle" || session.snapshot.state === "failed");
  const canStop =
    !session.isRequesting &&
    (session.snapshot.state === "connecting" ||
      session.snapshot.state === "connected");

  async function handleStart() {
    try {
      await startSession(platform);
    } catch (error) {
      console.warn("[desktop] failed to start streaming session", error);
    }
  }

  async function handleStop() {
    try {
      await stopSession(platform);
    } catch (error) {
      console.warn("[desktop] failed to stop streaming session", error);
    }
  }

  return (
    <div className="session-row">
      <div className="session-summary">
        <strong>{PLATFORM_LABELS[platform]}</strong>
        <span>{getSessionStatusLabel(session)}</span>
      </div>
      <div className="session-actions">
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
