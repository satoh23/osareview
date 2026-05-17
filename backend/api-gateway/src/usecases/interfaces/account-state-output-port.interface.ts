import type {
  AccountLinkProvider,
  AccountLinkState,
} from "@comment-dock/shared";

export type AccountLinkSnapshot = {
  provider: AccountLinkProvider;
  state: AccountLinkState;
  reason?: string;
};

export type AccountLinkSnapshots = Record<
  AccountLinkProvider,
  AccountLinkSnapshot
>;

export type AccountStateOutputEvent = AccountLinkSnapshot;

export interface AccountStateOutputPort {
  publishAccountState(event: AccountStateOutputEvent): Promise<void>;
}
