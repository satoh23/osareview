// features/account-link slice の Public API。
export {
  AccountLinkProvider,
  useAccountLink,
  useAccountLinks,
  useApplyAccountState,
  useLinkAccount,
  useUnlinkAccount,
} from "./model/account-link-context";
export {
  publishAccountLinkState,
  subscribeAccountLinkState,
} from "./model/account-link-events";
export type { AccountLinkEventListener } from "./model/account-link-events";
export type {
  AccountLinkStatus,
  AccountLinkStore,
} from "./model/account-link-reducer";
export type { AccountLinkProvider as Provider } from "@comment-dock/shared";
