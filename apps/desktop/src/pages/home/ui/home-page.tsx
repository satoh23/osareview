import { useState } from "react";
import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  type AccountLinkProvider as AccountLinkProviderName,
  type AccountLinkState,
  type SessionPlatform,
  type SessionState,
} from "@comment-dock/shared";
import reactLogo from "../../../assets/react.svg";
import {
  useAccountLink,
  useLinkAccount,
  useUnlinkAccount,
  type AccountLinkStatus,
} from "../../../features/account-link";
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

const ACCOUNT_LINK_STATE_LABELS: Record<AccountLinkState, string> = {
  unlinked: "非連携",
  linking: "連携中…",
  linked: "連携済",
  failed: "連携失敗",
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

      <section className="session-panel" aria-labelledby="account-panel-title">
        <h2 id="account-panel-title">アカウント連携</h2>
        <AccountLinkRow provider={SESSION_PLATFORMS.YOUTUBE} />
        <AccountLinkRow provider={SESSION_PLATFORMS.TWITCH} />
      </section>

      <section className="session-panel" aria-labelledby="session-panel-title">
        <h2 id="session-panel-title">配信セッション</h2>
        <StreamingSessionRow platform={SESSION_PLATFORMS.YOUTUBE} />
        <StreamingSessionRow platform={SESSION_PLATFORMS.TWITCH} />
      </section>
    </main>
  );
}

function AccountLinkRow({ provider }: { provider: AccountLinkProviderName }) {
  const account = useAccountLink(provider);
  const linkAccount = useLinkAccount();
  const unlinkAccount = useUnlinkAccount();
  const canLink =
    !account.isRequesting &&
    (account.snapshot.state === ACCOUNT_LINK_STATES.UNLINKED ||
      account.snapshot.state === ACCOUNT_LINK_STATES.FAILED);
  const canUnlink =
    !account.isRequesting &&
    account.snapshot.state === ACCOUNT_LINK_STATES.LINKED;

  async function handleLink() {
    try {
      await linkAccount(provider);
    } catch (error) {
      console.warn("[desktop] failed to link account", error);
    }
  }

  async function handleUnlink() {
    try {
      await unlinkAccount(provider);
    } catch (error) {
      console.warn("[desktop] failed to unlink account", error);
    }
  }

  return (
    <div className="session-row">
      <div className="session-summary">
        <strong>{PLATFORM_LABELS[provider]}</strong>
        <span>{getAccountLinkStatusLabel(account)}</span>
      </div>
      <div className="session-actions">
        <button type="button" disabled={!canLink} onClick={handleLink}>
          連携
        </button>
        <button type="button" disabled={!canUnlink} onClick={handleUnlink}>
          解除
        </button>
      </div>
    </div>
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

const getAccountLinkStatusLabel = (account: AccountLinkStatus): string => {
  const baseLabel = ACCOUNT_LINK_STATE_LABELS[account.snapshot.state];
  if (account.isRequesting) {
    return `${baseLabel}（処理中）`;
  }
  if (account.error) {
    return `${baseLabel}（${account.error}）`;
  }
  if (account.snapshot.reason) {
    return `${baseLabel}（${account.snapshot.reason}）`;
  }
  return baseLabel;
};

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
