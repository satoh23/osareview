import type { AccountLinkSnapshot } from "@comment-dock/shared";

export type AccountLinkEventListener = (account: AccountLinkSnapshot) => void;

const listeners = new Set<AccountLinkEventListener>();

/**
 * WebSocket 受信側から渡された account.state を、登録済み listener へ配送する。
 * WS クライアントと React Context を直接結合せず、この小さな中継点だけを共有する。
 */
export const publishAccountLinkState = (account: AccountLinkSnapshot): void => {
  for (const listener of listeners) {
    listener(account);
  }
};

/**
 * account.state の受け取り先を登録する。
 * 戻り値の関数を呼ぶと、その listener の登録を解除する。
 */
export const subscribeAccountLinkState = (
  listener: AccountLinkEventListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
