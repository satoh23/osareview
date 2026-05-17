import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  type AccountLinkProvider,
  type AccountLinkSnapshot,
  type AccountLinkSnapshots,
} from "@comment-dock/shared";

export type AccountLinkStatus = {
  snapshot: AccountLinkSnapshot;
  isRequesting: boolean;
  error?: string;
};

export type AccountLinkStore = {
  accounts: AccountLinkSnapshots;
  isInitialSynced: boolean;
  isInitialSyncing: boolean;
  requestInFlight: Record<AccountLinkProvider, boolean>;
  errors: Partial<Record<AccountLinkProvider, string>>;
  initialSyncError?: string;
};

export const ACCOUNT_LINK_ACTION_TYPES = {
  // 初回の GET /accounts を開始した。
  INITIAL_SYNC_STARTED: "initialSyncStarted",
  // 初回の GET /accounts が成功し、provider ごとの連携状態を受け取った。
  INITIAL_SYNC_SUCCEEDED: "initialSyncSucceeded",
  // 初回の GET /accounts が失敗した。
  INITIAL_SYNC_FAILED: "initialSyncFailed",
  // HTTP API の結果や WS の account.state で、1 provider の状態を追加または更新する。
  UPSERT_ACCOUNT_STATE: "upsertAccountState",
  // link / unlink リクエストを開始した。
  REQUEST_STARTED: "requestStarted",
  // link / unlink リクエストが失敗した。
  REQUEST_FAILED: "requestFailed",
} as const;

/**
 * accountLinkReducer に渡せる状態変更イベント。
 * type ごとに必要な payload を分け、accounts / account / provider / error の渡し忘れを型で防ぐ。
 */
export type AccountLinkAction =
  // 初回同期開始は開始フラグを立てるだけなので追加 payload は不要。
  | { type: typeof ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_STARTED }
  // 初回同期成功時は API Gateway から取得した provider 別状態で accounts 全体を置き換える。
  | {
      type: typeof ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED;
      accounts: AccountLinkSnapshots;
    }
  // 初回同期失敗時は画面に出す error 文字列を保持する。
  | {
      type: typeof ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_FAILED;
      error: string;
    }
  // HTTP API 結果または WS の account.state で、1 provider の状態を更新する。
  | {
      type: typeof ACCOUNT_LINK_ACTION_TYPES.UPSERT_ACCOUNT_STATE;
      account: AccountLinkSnapshot;
    }
  // link / unlink 開始時は対象 provider の処理中フラグを立てる。
  | {
      type: typeof ACCOUNT_LINK_ACTION_TYPES.REQUEST_STARTED;
      provider: AccountLinkProvider;
    }
  // link / unlink 失敗時は対象 provider の処理中フラグを戻し、error を保持する。
  | {
      type: typeof ACCOUNT_LINK_ACTION_TYPES.REQUEST_FAILED;
      provider: AccountLinkProvider;
      error: string;
    };

// テストしやすさのため、状態遷移だけを reducer に閉じ込め、React Context とは分離している。
export const createInitialAccountLinkStore = (): AccountLinkStore => ({
  accounts: createUnlinkedAccounts(),
  isInitialSynced: false,
  isInitialSyncing: false,
  requestInFlight: {
    [SESSION_PLATFORMS.YOUTUBE]: false,
    [SESSION_PLATFORMS.TWITCH]: false,
  },
  errors: {},
});

export const accountLinkReducer = (
  state: AccountLinkStore,
  action: AccountLinkAction,
): AccountLinkStore => {
  switch (action.type) {
    case ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_STARTED:
      return {
        ...state,
        isInitialSyncing: true,
        initialSyncError: undefined,
      };
    case ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED:
      return {
        ...state,
        accounts: action.accounts,
        isInitialSynced: true,
        isInitialSyncing: false,
        initialSyncError: undefined,
      };
    case ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_FAILED:
      return {
        ...state,
        isInitialSyncing: false,
        initialSyncError: action.error,
      };
    case ACCOUNT_LINK_ACTION_TYPES.UPSERT_ACCOUNT_STATE:
      return applyAccountSnapshot(state, action.account);
    case ACCOUNT_LINK_ACTION_TYPES.REQUEST_STARTED:
      return {
        ...state,
        requestInFlight: {
          ...state.requestInFlight,
          [action.provider]: true,
        },
        errors: omitProvider(state.errors, action.provider),
      };
    case ACCOUNT_LINK_ACTION_TYPES.REQUEST_FAILED:
      return {
        ...state,
        requestInFlight: {
          ...state.requestInFlight,
          [action.provider]: false,
        },
        errors: {
          ...state.errors,
          [action.provider]: action.error,
        },
      };
  }
};

export const selectAccountLinkStatus = (
  state: AccountLinkStore,
  provider: AccountLinkProvider,
): AccountLinkStatus => ({
  snapshot: state.accounts[provider],
  isRequesting: state.requestInFlight[provider],
  error: state.errors[provider],
});

const createUnlinkedAccounts = (): AccountLinkSnapshots => ({
  [SESSION_PLATFORMS.YOUTUBE]: {
    provider: SESSION_PLATFORMS.YOUTUBE,
    state: ACCOUNT_LINK_STATES.UNLINKED,
  },
  [SESSION_PLATFORMS.TWITCH]: {
    provider: SESSION_PLATFORMS.TWITCH,
    state: ACCOUNT_LINK_STATES.UNLINKED,
  },
});

const applyAccountSnapshot = (
  state: AccountLinkStore,
  account: AccountLinkSnapshot,
): AccountLinkStore => ({
  ...state,
  accounts: {
    ...state.accounts,
    [account.provider]: account,
  },
  requestInFlight: {
    ...state.requestInFlight,
    [account.provider]: false,
  },
  errors: omitProvider(state.errors, account.provider),
});

const omitProvider = (
  errors: Partial<Record<AccountLinkProvider, string>>,
  provider: AccountLinkProvider,
): Partial<Record<AccountLinkProvider, string>> => {
  const next = { ...errors };
  delete next[provider];
  return next;
};
