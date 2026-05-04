import { AsyncEntry } from "@napi-rs/keyring";
import type { Provider } from "../../../provider.js";
import type { TokenStore } from "../../../usecases/token-store.interface.js";
import {
  TokenSet,
  type TokenSetPlain,
} from "../../../entities/token/token-set.js";

const DEFAULT_ACCOUNT = "default";

/** `AsyncEntry` と同じ非同期操作だけテスト用に差し替え可能にする（export しない）。 */
type KeyringEntryAsync = Pick<
  AsyncEntry,
  "getPassword" | "setPassword" | "deletePassword"
>;

/** コンストラクタ用。`createEntry` はテストのモック差し替え向け（パッケージ公開 API ではない）。 */
type KeyringTokenStoreRepositoryOptions = {
  /** 省略時は `AsyncEntry` を使う。 */
  createEntry?: (service: string, account: string) => KeyringEntryAsync;
  /** keychain の account 名。省略時は `default`。 */
  account?: string;
};

function isTokenSetPlain(value: unknown): value is TokenSetPlain {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.accessToken === "string" &&
    typeof o.refreshToken === "string" &&
    typeof o.expiresAt === "number" &&
    Number.isFinite(o.expiresAt) &&
    typeof o.scope === "string" &&
    typeof o.obtainedAt === "number" &&
    Number.isFinite(o.obtainedAt)
  );
}

/**
 * `TokenStore` の OS keychain 実装（`@napi-rs/keyring` / `AsyncEntry`）。
 */
export class KeyringTokenStoreRepository implements TokenStore {
  private readonly createEntry: (
    service: string,
    account: string,
  ) => KeyringEntryAsync;

  private readonly account: string;

  constructor(options: KeyringTokenStoreRepositoryOptions = {}) {
    this.account = options.account ?? DEFAULT_ACCOUNT;
    this.createEntry =
      options.createEntry ??
      ((service, account) => new AsyncEntry(service, account));
  }

  private entry(provider: Provider): KeyringEntryAsync {
    return this.createEntry(`com.commentdock.auth.${provider}`, this.account);
  }

  async get(provider: Provider): Promise<TokenSet | null> {
    const raw = await this.entry(provider).getPassword();
    if (raw === undefined || raw === "") {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (isTokenSetPlain(parsed) === false) {
        return null;
      }
      return TokenSet.create(parsed);
    } catch {
      return null;
    }
  }

  async save(provider: Provider, tokenSet: TokenSet): Promise<void> {
    await this.entry(provider).setPassword(JSON.stringify(tokenSet.toPlain()));
  }

  async clear(provider: Provider): Promise<void> {
    const entry = this.entry(provider);
    const current = await entry.getPassword();
    if (current === undefined || current === "") {
      return;
    }
    await entry.deletePassword();
  }
}
