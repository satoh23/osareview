import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AccountLinkProvider,
  AccountLinkSnapshot,
} from "@comment-dock/shared";
import {
  createAccountLinkClient,
  type AccountLinkClient,
} from "../../../shared/api/control";
import { ACCOUNT_LINK_ERROR_MESSAGES } from "../../../shared/const";
import {
  ACCOUNT_LINK_ACTION_TYPES,
  accountLinkReducer,
  createInitialAccountLinkStore,
  selectAccountLinkStatus,
  type AccountLinkStatus,
  type AccountLinkStore,
} from "./account-link-reducer";
import { subscribeAccountLinkState } from "./account-link-events";

type AccountLinkContextValue = {
  store: AccountLinkStore;
  applyAccountState: (account: AccountLinkSnapshot) => void;
  linkAccount: (provider: AccountLinkProvider) => Promise<AccountLinkSnapshot>;
  unlinkAccount: (
    provider: AccountLinkProvider,
  ) => Promise<AccountLinkSnapshot>;
};

type AccountLinkProviderProps = {
  children: ReactNode;
  client?: AccountLinkClient;
};

const AccountLinkContext = createContext<AccountLinkContextValue | null>(null);

export function AccountLinkProvider({
  children,
  client = createAccountLinkClient(),
}: AccountLinkProviderProps) {
  // reducer は状態遷移だけを担当し、Context は API やイベント購読の副作用を束ねる。
  const [store, dispatch] = useReducer(
    accountLinkReducer,
    undefined,
    createInitialAccountLinkStore,
  );

  // API 応答や外部イベントから届いた snapshot を store に反映する入口。
  const applyAccountState = useCallback((account: AccountLinkSnapshot) => {
    dispatch({
      type: ACCOUNT_LINK_ACTION_TYPES.UPSERT_ACCOUNT_STATE,
      account,
    });
  }, []);

  useEffect(() => {
    let isActive = true;
    dispatch({ type: ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_STARTED });

    // 初回表示時に backend の現在状態を取得し、ローカル store を同期する。
    void client
      .getAccountLinkStates()
      .then((accounts) => {
        if (!isActive) {
          return;
        }
        dispatch({
          type: ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED,
          accounts,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }
        dispatch({
          type: ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_FAILED,
          error: getErrorMessage(error),
        });
      });

    return () => {
      isActive = false;
    };
  }, [client]);

  // WS 受信処理とは events を介してつなぎ、React Context との直接結合を避ける。
  useEffect(
    () => subscribeAccountLinkState((account) => applyAccountState(account)),
    [applyAccountState],
  );

  const linkAccount = useCallback(
    async (provider: AccountLinkProvider): Promise<AccountLinkSnapshot> => {
      // リクエスト中・成功・失敗を reducer に渡し、API 呼び出しの副作用を Context に閉じる。
      dispatch({ type: ACCOUNT_LINK_ACTION_TYPES.REQUEST_STARTED, provider });
      try {
        const account = await client.linkAccount(provider);
        applyAccountState(account);
        return account;
      } catch (error) {
        dispatch({
          type: ACCOUNT_LINK_ACTION_TYPES.REQUEST_FAILED,
          provider,
          error: getErrorMessage(error),
        });
        throw error;
      }
    },
    [applyAccountState, client],
  );

  const unlinkAccount = useCallback(
    async (provider: AccountLinkProvider): Promise<AccountLinkSnapshot> => {
      // 解除操作も連携操作と同じ状態遷移に揃え、UI が同じ形で扱えるようにする。
      dispatch({ type: ACCOUNT_LINK_ACTION_TYPES.REQUEST_STARTED, provider });
      try {
        const account = await client.unlinkAccount(provider);
        applyAccountState(account);
        return account;
      } catch (error) {
        dispatch({
          type: ACCOUNT_LINK_ACTION_TYPES.REQUEST_FAILED,
          provider,
          error: getErrorMessage(error),
        });
        throw error;
      }
    },
    [applyAccountState, client],
  );

  const value = useMemo(
    () => ({
      store,
      applyAccountState,
      linkAccount,
      unlinkAccount,
    }),
    [applyAccountState, linkAccount, store, unlinkAccount],
  );

  return (
    <AccountLinkContext.Provider value={value}>
      {children}
    </AccountLinkContext.Provider>
  );
}

export function useAccountLink(
  provider: AccountLinkProvider,
): AccountLinkStatus {
  const { store } = useAccountLinkContext();
  return selectAccountLinkStatus(store, provider);
}

export function useAccountLinks(): AccountLinkStore {
  return useAccountLinkContext().store;
}

export function useApplyAccountState(): (account: AccountLinkSnapshot) => void {
  return useAccountLinkContext().applyAccountState;
}

export function useLinkAccount(): (
  provider: AccountLinkProvider,
) => Promise<AccountLinkSnapshot> {
  return useAccountLinkContext().linkAccount;
}

export function useUnlinkAccount(): (
  provider: AccountLinkProvider,
) => Promise<AccountLinkSnapshot> {
  return useAccountLinkContext().unlinkAccount;
}

const useAccountLinkContext = (): AccountLinkContextValue => {
  const context = useContext(AccountLinkContext);
  if (!context) {
    throw new Error(
      ACCOUNT_LINK_ERROR_MESSAGES.HOOKS_OUTSIDE_ACCOUNT_LINK_PROVIDER,
    );
  }
  return context;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
