import { inject, injectable } from "tsyringe";
import type { AuthClient } from "@comment-dock/auth";
import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  type AccountLinkProvider,
} from "@comment-dock/shared";
import { API_GATEWAY_DI_TOKENS } from "../infrastructure/shared/di-tokens.js";
import type {
  AccountLinkSnapshot,
  AccountLinkSnapshots,
  AccountStateOutputPort,
} from "./interfaces/account-state-output-port.interface.js";

type AccountLinkSlot = AccountLinkSnapshot & {
  linkAttemptId: number;
};

const ACCOUNT_LINK_PROVIDERS = [
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
] as const satisfies readonly AccountLinkProvider[];

@injectable()
export class ManageAccountLinksUseCase {
  private nextLinkAttemptId = 0;

  private readonly accounts: Record<AccountLinkProvider, AccountLinkSlot> = {
    [SESSION_PLATFORMS.YOUTUBE]: {
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.UNLINKED,
      linkAttemptId: 0,
    },
    [SESSION_PLATFORMS.TWITCH]: {
      provider: SESSION_PLATFORMS.TWITCH,
      state: ACCOUNT_LINK_STATES.UNLINKED,
      linkAttemptId: 0,
    },
  };

  constructor(
    // authClient と outputPort を DI で注入し、OAuth 実処理と状態 push を単体テストで差し替えやすくする。
    @inject(API_GATEWAY_DI_TOKENS.authClient)
    private readonly authClient: AuthClient,
    @inject(API_GATEWAY_DI_TOKENS.accountStateOutputPort)
    private readonly accountStateOutputPort: AccountStateOutputPort,
  ) {}

  /**
   * 保存済み token の有無から、provider ごとの初期連携状態を確定する。
   * 起動時の不要な refresh を避けるため、ここでは auth の状態取得だけを行う。
   */
  async initialize(): Promise<void> {
    await Promise.all(
      ACCOUNT_LINK_PROVIDERS.map(async (provider) => {
        const status = await this.authClient.getLinkStatus(provider);
        const slot = this.getSlot(provider);
        slot.state =
          status.state === "linked"
            ? ACCOUNT_LINK_STATES.LINKED
            : ACCOUNT_LINK_STATES.UNLINKED;
        slot.reason = undefined;
      }),
    );
  }

  /**
   * 指定 provider の OAuth ログインをバックグラウンドで開始する。
   * 呼び出し元へは linking 状態を即時返し、完了/失敗は後続の状態 push で伝える。
   */
  async link(provider: AccountLinkProvider): Promise<AccountLinkSnapshot> {
    const slot = this.getSlot(provider);
    if (slot.state === ACCOUNT_LINK_STATES.LINKING) {
      return this.toSnapshot(slot);
    }

    const linkAttemptId = this.nextLinkAttemptId + 1;
    this.nextLinkAttemptId = linkAttemptId;
    slot.linkAttemptId = linkAttemptId;
    await this.updateAccountState({
      provider,
      state: ACCOUNT_LINK_STATES.LINKING,
    });

    void this.authClient
      .login(provider)
      .then(async () => {
        if (slot.linkAttemptId !== linkAttemptId) {
          return;
        }
        await this.updateAccountState({
          provider,
          state: ACCOUNT_LINK_STATES.LINKED,
        });
      })
      .catch(async (error: unknown) => {
        if (slot.linkAttemptId !== linkAttemptId) {
          return;
        }
        await this.updateAccountState({
          provider,
          state: ACCOUNT_LINK_STATES.FAILED,
          reason: error instanceof Error ? error.message : String(error),
        });
      });

    return this.toSnapshot(slot);
  }

  /**
   * 指定 provider の保存済み token を削除し、非連携状態を通知する。
   */
  async unlink(provider: AccountLinkProvider): Promise<AccountLinkSnapshot> {
    const slot = this.getSlot(provider);
    slot.linkAttemptId += 1;
    await this.authClient.logout(provider);
    await this.updateAccountState({
      provider,
      state: ACCOUNT_LINK_STATES.UNLINKED,
    });
    return this.toSnapshot(slot);
  }

  /**
   * refresh 失敗など auth 側で認可喪失を検知した時に、非連携状態へ遷移させる。
   */
  async markAsUnlinked(
    provider: AccountLinkProvider,
    reason?: string,
  ): Promise<AccountLinkSnapshot> {
    const slot = this.getSlot(provider);
    slot.linkAttemptId += 1;
    await this.updateAccountState({
      provider,
      state: ACCOUNT_LINK_STATES.UNLINKED,
      ...(reason ? { reason } : {}),
    });
    return this.toSnapshot(slot);
  }

  getSnapshot(): AccountLinkSnapshots {
    return Object.fromEntries(
      ACCOUNT_LINK_PROVIDERS.map((provider) => [
        provider,
        this.toSnapshot(this.getSlot(provider)),
      ]),
    ) as AccountLinkSnapshots;
  }

  private getSlot(provider: AccountLinkProvider): AccountLinkSlot {
    return this.accounts[provider];
  }

  private async updateAccountState(
    nextSnapshot: AccountLinkSnapshot,
  ): Promise<void> {
    const slot = this.getSlot(nextSnapshot.provider);
    const currentSnapshot = this.toSnapshot(slot);

    if (
      currentSnapshot.state === nextSnapshot.state &&
      currentSnapshot.reason === nextSnapshot.reason
    ) {
      return;
    }

    slot.state = nextSnapshot.state;
    slot.reason = nextSnapshot.reason;
    await this.accountStateOutputPort.publishAccountState(
      this.toSnapshot(slot),
    );
  }

  private toSnapshot(slot: AccountLinkSlot): AccountLinkSnapshot {
    return {
      provider: slot.provider,
      state: slot.state,
      ...(slot.reason ? { reason: slot.reason } : {}),
    };
  }
}
