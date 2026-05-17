import { useId, useState } from "react";
import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  type AccountLinkProvider,
  type AccountLinkState,
  type SessionPlatform,
} from "@comment-dock/shared";
import {
  useAccountLink,
  useLinkAccount,
  useUnlinkAccount,
  type AccountLinkStatus,
} from "../../../features/account-link";
import { ACCOUNT_LINK_WARN_MESSAGES } from "../../../shared/const";
import styles from "./settings-menu.module.css";

const ACCOUNT_LINK_STATE_LABELS: Record<AccountLinkState, string> = {
  unlinked: "非連携",
  linking: "非連携",
  linked: "連携済",
  failed: "連携失敗",
};

const PLATFORM_LABELS: Record<SessionPlatform, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
};

const ACCOUNT_LINK_PROVIDERS = [
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
] as const satisfies readonly AccountLinkProvider[];

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();

  return (
    <div className={styles.root}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={styles.menuButton}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">☰</span>
        設定
      </button>

      {isOpen ? (
        <>
          <button
            aria-label="設定メニューを閉じる"
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.panel}
            role="dialog"
          >
            <header className={styles.header}>
              <h2 className={styles.title} id={titleId}>
                アカウント連携
              </h2>
              <button onClick={() => setIsOpen(false)} type="button">
                閉じる
              </button>
            </header>
            <div className={styles.list}>
              {ACCOUNT_LINK_PROVIDERS.map((provider) => (
                <AccountLinkRow key={provider} provider={provider} />
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AccountLinkRow({ provider }: { provider: AccountLinkProvider }) {
  const account = useAccountLink(provider);
  const linkAccount = useLinkAccount();
  const unlinkAccount = useUnlinkAccount();
  const canLink =
    account.snapshot.state === ACCOUNT_LINK_STATES.UNLINKED ||
    account.snapshot.state === ACCOUNT_LINK_STATES.LINKING ||
    account.snapshot.state === ACCOUNT_LINK_STATES.FAILED;
  const canUnlink =
    !account.isRequesting &&
    account.snapshot.state === ACCOUNT_LINK_STATES.LINKED;

  async function handleLink() {
    try {
      await linkAccount(provider);
    } catch (error) {
      console.warn(ACCOUNT_LINK_WARN_MESSAGES.FAILED_TO_LINK_ACCOUNT, error);
    }
  }

  async function handleUnlink() {
    try {
      await unlinkAccount(provider);
    } catch (error) {
      console.warn(ACCOUNT_LINK_WARN_MESSAGES.FAILED_TO_UNLINK_ACCOUNT, error);
    }
  }

  return (
    <div className={styles.row}>
      <div className={styles.summary}>
        <strong>{PLATFORM_LABELS[provider]}</strong>
        <span className={styles.status}>
          {getAccountLinkStatusLabel(account)}
        </span>
      </div>
      <div className={styles.actions}>
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

const getAccountLinkStatusLabel = (account: AccountLinkStatus): string => {
  const baseLabel = ACCOUNT_LINK_STATE_LABELS[account.snapshot.state];
  if (account.error) {
    return `${baseLabel}（${account.error}）`;
  }
  if (account.snapshot.reason) {
    return `${baseLabel}（${account.snapshot.reason}）`;
  }
  return baseLabel;
};
