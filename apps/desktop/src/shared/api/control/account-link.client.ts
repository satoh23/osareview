import type {
  AccountLinkProvider,
  AccountLinkResponse,
  AccountLinkState,
  AccountLinkSnapshot,
  AccountLinkSnapshots,
  AccountLinksResponse,
} from "@comment-dock/shared";
import { ACCOUNT_LINK_STATES, SESSION_PLATFORMS } from "@comment-dock/shared";
import { API_CONTROL_ERROR_MESSAGES } from "../../const";
import { apiGatewayHttpClient, type ApiGatewayHttpClient } from "./http-client";

export type AccountLinkClient = {
  getAccountLinkStates: () => Promise<AccountLinkSnapshots>;
  linkAccount: (provider: AccountLinkProvider) => Promise<AccountLinkSnapshot>;
  unlinkAccount: (
    provider: AccountLinkProvider,
  ) => Promise<AccountLinkSnapshot>;
};

/**
 * api-gateway のアカウント連携 API を呼ぶ client を生成する。
 *
 * 目的:
 * - UI / feature から HTTP の path やレスポンス形状を直接扱わずに済むよう、
 *   アカウント連携操作を `getAccountLinkStates` / `linkAccount` / `unlinkAccount`
 *   という用途単位の関数へ閉じ込める。
 *
 * 処理:
 * - `GET /accounts` で YouTube / Twitch の現在の連携状態を取得する。
 * - `POST /accounts/:provider/link` で対象 provider の連携を開始する。
 * - `POST /accounts/:provider/unlink` で対象 provider の連携を解除する。
 * - api-gateway の JSON レスポンスを account link の契約型として検証して返す。
 *
 * 主にテストで httpClient を差し替え、実 HTTP 通信なしで検証できるようにしている。
 */
export const createAccountLinkClient = (
  httpClient: ApiGatewayHttpClient = apiGatewayHttpClient,
): AccountLinkClient => ({
  async getAccountLinkStates(): Promise<AccountLinkSnapshots> {
    const response = await httpClient.requestJson<unknown>("/accounts");
    return parseAccountsResponse(response).accounts;
  },

  async linkAccount(
    provider: AccountLinkProvider,
  ): Promise<AccountLinkSnapshot> {
    const response = await httpClient.requestJson<unknown>(
      `/accounts/${provider}/link`,
      { method: "POST" },
    );
    return parseAccountResponse(response).account;
  },

  async unlinkAccount(
    provider: AccountLinkProvider,
  ): Promise<AccountLinkSnapshot> {
    const response = await httpClient.requestJson<unknown>(
      `/accounts/${provider}/unlink`,
      { method: "POST" },
    );
    return parseAccountResponse(response).account;
  },
});

export const accountLinkClient = createAccountLinkClient();

// NOTE: 画面側で `linkAccount("youtube")` のように直接 import して使える
// 既定 client のショートカット。bind はメソッドを単体関数として渡しても
// 呼び出しコンテキストが壊れないようにするための安全策。
export const getAccountLinkStates =
  accountLinkClient.getAccountLinkStates.bind(accountLinkClient);
export const linkAccount =
  accountLinkClient.linkAccount.bind(accountLinkClient);
export const unlinkAccount =
  accountLinkClient.unlinkAccount.bind(accountLinkClient);

const parseAccountResponse = (value: unknown): AccountLinkResponse => {
  if (!isJsonObject(value) || !isAccountLinkSnapshot(value.account)) {
    throw new Error(API_CONTROL_ERROR_MESSAGES.INVALID_ACCOUNT_RESPONSE);
  }
  return { account: value.account };
};

const parseAccountsResponse = (value: unknown): AccountLinksResponse => {
  if (!isJsonObject(value) || !isJsonObject(value.accounts)) {
    throw new Error(API_CONTROL_ERROR_MESSAGES.INVALID_ACCOUNTS_RESPONSE);
  }

  const youtube = value.accounts.youtube;
  const twitch = value.accounts.twitch;
  if (!isAccountLinkSnapshot(youtube) || !isAccountLinkSnapshot(twitch)) {
    throw new Error(API_CONTROL_ERROR_MESSAGES.INVALID_ACCOUNTS_RESPONSE);
  }

  return {
    accounts: {
      youtube,
      twitch,
    },
  };
};

/**
 * API Gateway から返った unknown を AccountLinkSnapshot として扱えるか検証する。
 * provider / state は shared の契約に含まれる値だけを許可し、reason は未指定か文字列だけを許可する。
 */
const isAccountLinkSnapshot = (value: unknown): value is AccountLinkSnapshot =>
  isJsonObject(value) &&
  isAccountLinkProvider(value.provider) &&
  isAccountLinkState(value.state) &&
  (value.reason === undefined || typeof value.reason === "string");

const isAccountLinkProvider = (value: unknown): value is AccountLinkProvider =>
  value === SESSION_PLATFORMS.YOUTUBE || value === SESSION_PLATFORMS.TWITCH;

const isAccountLinkState = (value: unknown): value is AccountLinkState =>
  value === ACCOUNT_LINK_STATES.UNLINKED ||
  value === ACCOUNT_LINK_STATES.LINKING ||
  value === ACCOUNT_LINK_STATES.LINKED ||
  value === ACCOUNT_LINK_STATES.FAILED;

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
